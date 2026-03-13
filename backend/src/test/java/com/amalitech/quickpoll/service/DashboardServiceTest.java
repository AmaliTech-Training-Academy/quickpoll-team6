package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.analytics.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.analytics.AnalyticsOptionBreakdown;
import com.amalitech.quickpoll.model.analytics.AnalyticsPollSummary;
import com.amalitech.quickpoll.model.analytics.AnalyticsUserParticipation;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.DashboardRepository;
import com.amalitech.quickpoll.repository.PollAnalyticsRepository;
import com.amalitech.quickpoll.repository.UserParticipationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private DashboardRepository dashboardRepository;
    @Mock private PollAnalyticsRepository pollAnalyticsRepository;
    @Mock private UserParticipationRepository userParticipationRepository;

    @InjectMocks
    private DashboardService dashboardService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User admin() {
        User u = new User();
        u.setId(1L);
        u.setRole(Role.ADMIN);
        return u;
    }

    private User creator() {
        User u = new User();
        u.setId(2L);
        u.setRole(Role.USER); // Normal user, effectively a creator in this context
        return u;
    }

    // ── /dashboard/summary ────────────────────────────────────────────────────

    @Test
    void getDashboardSummary_AdminUser_ReturnsGlobalSummary() {
        DashboardRepository.SummaryProjection mockProj = mock(DashboardRepository.SummaryProjection.class);
        when(mockProj.getActive_poll_count()).thenReturn(5L);
        when(mockProj.getAverage_participation_rate()).thenReturn(45.5);
        when(dashboardRepository.getGlobalSummary()).thenReturn(mockProj);

        DashboardSummaryResponse res = dashboardService.getDashboardSummary(admin());

        assertEquals(5L, res.getActivePollCount());
        assertEquals(45.5, res.getAverageParticipationRate());
        verify(dashboardRepository).getGlobalSummary();
        verify(dashboardRepository, never()).getCreatorSummary(anyLong());
    }

    @Test
    void getDashboardSummary_CreatorUser_ReturnsCreatorSummary() {
        DashboardRepository.SummaryProjection mockProj = mock(DashboardRepository.SummaryProjection.class);
        when(mockProj.getActive_poll_count()).thenReturn(2L);
        when(dashboardRepository.getCreatorSummary(2L)).thenReturn(mockProj);

        DashboardSummaryResponse res = dashboardService.getDashboardSummary(creator());

        assertEquals(2L, res.getActivePollCount());
        verify(dashboardRepository).getCreatorSummary(2L);
    }

    // ── /dashboard/active-polls ──────────────────────────────────────────────

    @Test
    void getActivePolls_AdminUser_SeesAllActive() {
        AnalyticsPollSummary summary = new AnalyticsPollSummary();
        summary.setPollId(10L);
        Page<AnalyticsPollSummary> page = new PageImpl<>(List.of(summary));
        when(dashboardRepository.findByStatusOrderByLastUpdatedDescCreatedAtDesc(eq("ACTIVE"), any()))
                .thenReturn(page);

        Page<ActivePollDashboardResponse> res = dashboardService.getActivePolls(admin(), 0, 10);

        assertEquals(1, res.getContent().size());
        assertEquals(10L, res.getContent().get(0).getPollId());
    }

    @Test
    void getActivePolls_CreatorUser_SeesOwnActive() {
        AnalyticsPollSummary summary = new AnalyticsPollSummary();
        summary.setPollId(11L);
        Page<AnalyticsPollSummary> page = new PageImpl<>(List.of(summary));
        when(dashboardRepository.findByStatusAndCreatorIdOrderByLastUpdatedDescCreatedAtDesc(eq("ACTIVE"), eq(2L), any()))
                .thenReturn(page);

        Page<ActivePollDashboardResponse> res = dashboardService.getActivePolls(creator(), 0, 10);

        assertEquals(1, res.getContent().size());
        assertEquals(11L, res.getContent().get(0).getPollId());
    }

    // ── /dashboard/recent-results ────────────────────────────────────────────

    @Test
    void getRecentResults_AdminUser_DerivesWinnerCorrectly() {
        // Poll 100 has two options: 500 (10 votes) and 501 (15 votes) -> 501 wins
        // Poll 101 has two tied options: 600 (5 votes) and 601 (5 votes) -> 600 wins
        AnalyticsPollSummary s1 = new AnalyticsPollSummary(); s1.setPollId(100L);
        AnalyticsPollSummary s2 = new AnalyticsPollSummary(); s2.setPollId(101L);
        Page<AnalyticsPollSummary> page = new PageImpl<>(List.of(s1, s2));

        when(dashboardRepository.findAllByOrderByLastUpdatedDesc(any())).thenReturn(page);

        AnalyticsOptionBreakdown o1 = new AnalyticsOptionBreakdown(); o1.setPollId(100L); o1.setOptionId(500L); o1.setVoteCount(10L);
        AnalyticsOptionBreakdown o2 = new AnalyticsOptionBreakdown(); o2.setPollId(100L); o2.setOptionId(501L); o2.setVoteCount(15L);
        
        AnalyticsOptionBreakdown o3 = new AnalyticsOptionBreakdown(); o3.setPollId(101L); o3.setOptionId(600L); o3.setVoteCount(5L);
        AnalyticsOptionBreakdown o4 = new AnalyticsOptionBreakdown(); o4.setPollId(101L); o4.setOptionId(601L); o4.setVoteCount(5L);

        when(pollAnalyticsRepository.findByPollIdIn(List.of(100L, 101L)))
                .thenReturn(List.of(o1, o2, o3, o4));

        Page<RecentResultResponse> res = dashboardService.getRecentResults(admin(), 0, 10);

        assertEquals(2, res.getContent().size());
        
        RecentResultResponse r1 = res.getContent().stream().filter(r -> r.getPollId() == 100L).findFirst().get();
        assertNotNull(r1.getWinningOption());
        assertEquals(501L, r1.getWinningOption().getOptionId());

        RecentResultResponse r2 = res.getContent().stream().filter(r -> r.getPollId() == 101L).findFirst().get();
        assertNotNull(r2.getWinningOption());
        assertEquals(600L, r2.getWinningOption().getOptionId()); // Tie-break: lowest option ID wins
    }

    @Test
    void getRecentResults_EmptyVotes_NoWinner() {
        AnalyticsPollSummary s1 = new AnalyticsPollSummary(); s1.setPollId(100L);
        Page<AnalyticsPollSummary> page = new PageImpl<>(List.of(s1));

        when(dashboardRepository.findAllByOrderByLastUpdatedDesc(any())).thenReturn(page);

        // Options exist, but vote counts are 0
        AnalyticsOptionBreakdown o1 = new AnalyticsOptionBreakdown(); o1.setPollId(100L); o1.setOptionId(500L); o1.setVoteCount(0L);
        when(pollAnalyticsRepository.findByPollIdIn(List.of(100L))).thenReturn(List.of(o1));

        Page<RecentResultResponse> res = dashboardService.getRecentResults(admin(), 0, 10);

        assertEquals(1, res.getContent().size());
        assertNull(res.getContent().get(0).getWinningOption());
    }

    // ── /dashboard/top-users ─────────────────────────────────────────────────

    @Test
    void getTopUsers_AdminUser_ReturnsResults() {
        AnalyticsUserParticipation up = new AnalyticsUserParticipation();
        up.setUserId(50L);
        up.setTotalVotesCast(100L);
        when(userParticipationRepository.findAllByOrderByTotalVotesCastDescLastActiveDesc(any()))
                .thenReturn(new PageImpl<>(List.of(up)));

        Page<TopUserResponse> res = dashboardService.getTopUsers(admin(), 0, 10);

        assertEquals(1, res.getContent().size());
        assertEquals(50L, res.getContent().get(0).getUserId());
        assertEquals(100L, res.getContent().get(0).getTotalVotesCast());
    }


}
