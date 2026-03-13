package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.analytics.PollResultsResponse;
import com.amalitech.quickpoll.dto.analytics.PollResultsTimeseriesResponse;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.model.Poll;
import com.amalitech.quickpoll.model.PollInvite;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.DepartmentMember;
import com.amalitech.quickpoll.model.analytics.AnalyticsOptionBreakdown;
import com.amalitech.quickpoll.model.analytics.AnalyticsPollSummary;
import com.amalitech.quickpoll.model.analytics.AnalyticsVotesTimeseries;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.DashboardRepository;
import com.amalitech.quickpoll.repository.PollAnalyticsRepository;
import com.amalitech.quickpoll.repository.PollInviteRepository;
import com.amalitech.quickpoll.repository.PollRepository;
import com.amalitech.quickpoll.repository.TimeseriesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PollServiceAnalyticsTest {

    @Mock private PollRepository pollRepository;
    @Mock private PollInviteRepository pollInviteRepository;
    @Mock private DashboardRepository dashboardRepository;
    @Mock private PollAnalyticsRepository pollAnalyticsRepository;
    @Mock private TimeseriesRepository timeseriesRepository;

    @InjectMocks
    private PollService pollService;

    private Poll mockPoll;
    private User admin;
    private User creator;
    private User entitledUser;
    private User stranger;

    @BeforeEach
    void setUp() {
        creator = new User();
        creator.setId(10L);
        creator.setRole(Role.USER);

        admin = new User();
        admin.setId(11L);
        admin.setRole(Role.ADMIN);

        entitledUser = new User();
        entitledUser.setId(12L);
        entitledUser.setEmail("entitled@example.com");
        entitledUser.setRole(Role.USER);

        stranger = new User();
        stranger.setId(13L);
        stranger.setEmail("stranger@example.com");
        stranger.setRole(Role.USER);

        mockPoll = new Poll();
        mockPoll.setId(100L);
        mockPoll.setCreator(creator);
    }

    // ── getPollAnalyticsResults ──────────────────────────────────────────────

    @Test
    void getPollResults_AdminUser_Returns200() {
        when(pollRepository.findById(100L)).thenReturn(Optional.of(mockPoll));
        setupHappyPathOlapData();

        PollResultsResponse res = pollService.getPollAnalyticsResults(100L, admin);

        assertNotNull(res);
        assertEquals(100L, res.getPollId());
        assertEquals("Title", res.getTitle());
    }

    @Test
    void getPollResults_CreatorUser_Returns200() {
        when(pollRepository.findById(100L)).thenReturn(Optional.of(mockPoll));
        setupHappyPathOlapData();

        PollResultsResponse res = pollService.getPollAnalyticsResults(100L, creator);

        assertNotNull(res);
        assertEquals(100L, res.getPollId());
    }

    @Test
    void getPollResults_EntitledParticipant_Returns200() {
        when(pollRepository.findById(100L)).thenReturn(Optional.of(mockPoll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(100L, "entitled@example.com"))
                .thenReturn(Optional.of(new PollInvite()));
        setupHappyPathOlapData();

        PollResultsResponse res = pollService.getPollAnalyticsResults(100L, entitledUser);

        assertNotNull(res);
        assertEquals(100L, res.getPollId());
    }

    @Test
    void getPollResults_UnentitledParticipant_ThrowsAccessDenied() {
        when(pollRepository.findById(100L)).thenReturn(Optional.of(mockPoll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(100L, "stranger@example.com"))
                .thenReturn(Optional.empty()); // No invite row

        assertThrows(AccessDeniedException.class, () ->
                pollService.getPollAnalyticsResults(100L, stranger));

        verify(dashboardRepository, never()).findByPollId(anyLong());
    }

    @Test
    void getPollResults_PollNotFoundInOltp_ThrowsResourceNotFoundException() {
        when(pollRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                pollService.getPollAnalyticsResults(999L, admin));
    }

    private void setupHappyPathOlapData() {
        AnalyticsPollSummary summary = new AnalyticsPollSummary();
        summary.setPollId(100L);
        summary.setTitle("Title");
        
        AnalyticsOptionBreakdown option = new AnalyticsOptionBreakdown();
        option.setOptionId(5L);
        option.setOptionText("Option A");
        option.setVoteCount(10L);

        when(dashboardRepository.findByPollId(100L)).thenReturn(Optional.of(summary));
        when(pollAnalyticsRepository.findByPollIdOrderByOptionIdAsc(100L))
                .thenReturn(List.of(option));
    }

    // ── getPollTimeseries ────────────────────────────────────────────────────

    @Test
    void getPollTimeseries_WithDateFilter_PassesFilterToRepo() {
        when(pollRepository.findById(100L)).thenReturn(Optional.of(mockPoll));
        // Using creator to bypass invite check
        
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now();

        AnalyticsVotesTimeseries row = new AnalyticsVotesTimeseries();
        row.setBucketTime(from);
        row.setVotesInBucket(5L);

        when(timeseriesRepository.findByPollIdAndOptionalRange(100L, from, to))
                .thenReturn(List.of(row));

        PollResultsTimeseriesResponse res = pollService.getPollTimeseries(100L, creator, from, to);

        assertEquals(100L, res.getPollId());
        assertEquals(1, res.getPoints().size());
        assertEquals(5L, res.getPoints().get(0).getVotesInBucket());
        
        verify(timeseriesRepository).findByPollIdAndOptionalRange(100L, from, to);
    }
}
