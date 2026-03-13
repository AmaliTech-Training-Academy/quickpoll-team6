package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.analytics.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.analytics.AnalyticsOptionBreakdown;
import com.amalitech.quickpoll.model.analytics.AnalyticsPollSummary;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.DashboardRepository;
import com.amalitech.quickpoll.repository.PollAnalyticsRepository;
import com.amalitech.quickpoll.repository.UserParticipationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final PollAnalyticsRepository pollAnalyticsRepository;
    private final UserParticipationRepository userParticipationRepository;



    /**
     * Returns KPI summary cards. Admin sees global stats; creator sees only
     * their own polls. Participants get a 403.
     */
    public DashboardSummaryResponse getDashboardSummary(User user) {
        DashboardRepository.SummaryProjection proj = isAdmin(user)
                ? dashboardRepository.getGlobalSummary()
                : dashboardRepository.getCreatorSummary(user.getId());

        if (proj == null) {
            return DashboardSummaryResponse.builder().build();
        }

        return DashboardSummaryResponse.builder()
                .activePollCount(nullToZero(proj.getActive_poll_count()))
                .closedPollCount(nullToZero(proj.getClosed_poll_count()))
                .totalPollCount(nullToZero(proj.getTotal_poll_count()))
                .totalVotesCast(nullToZero(proj.getTotal_votes_cast()))
                .averageParticipationRate(nullToZeroD(proj.getAverage_participation_rate()))
                .lastRefreshedAt(proj.getLast_refreshed_at())
                .build();
    }



    /**
     * Returns paginated active polls. Admin sees all; creator sees own;
     * participants are rejected.
     */
    public Page<ActivePollDashboardResponse> getActivePolls(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<AnalyticsPollSummary> summaries = isAdmin(user)
                ? dashboardRepository.findByStatusOrderByLastUpdatedDescCreatedAtDesc("ACTIVE", pageable)
                : dashboardRepository.findByStatusAndCreatorIdOrderByLastUpdatedDescCreatedAtDesc(
                        "ACTIVE", user.getId(), pageable);

        return summaries.map(this::toActivePollResponse);
    }



    /**
     * Returns recently updated polls with their winning option.
     * Two-step read: paged summaries then batch option load.
     */
    public Page<RecentResultResponse> getRecentResults(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<AnalyticsPollSummary> summaries = isAdmin(user)
                ? dashboardRepository.findAllByOrderByLastUpdatedDesc(pageable)
                : dashboardRepository.findByCreatorIdOrderByLastUpdatedDesc(user.getId(), pageable);

        if (summaries.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> pollIds = summaries.getContent().stream()
                .map(AnalyticsPollSummary::getPollId)
                .toList();

        List<AnalyticsOptionBreakdown> allOptions = pollAnalyticsRepository.findByPollIdIn(pollIds);
        Map<Long, List<AnalyticsOptionBreakdown>> optionsByPollId = allOptions.stream()
                .collect(Collectors.groupingBy(AnalyticsOptionBreakdown::getPollId));

        List<RecentResultResponse> content = summaries.getContent().stream()
                .map(s -> toRecentResultResponse(s, optionsByPollId.getOrDefault(s.getPollId(), List.of())))
                .toList();

        return new PageImpl<>(content, pageable, summaries.getTotalElements());
    }



    /**
     * Admin-only leaderboard of most active users.
     */
    public Page<TopUserResponse> getTopUsers(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return userParticipationRepository
                .findAllByOrderByTotalVotesCastDescLastActiveDesc(pageable)
                .map(p -> TopUserResponse.builder()
                        .userId(p.getUserId())
                        .userName(p.getUserName())
                        .totalVotesCast(p.getTotalVotesCast())
                        .pollsParticipated(p.getPollsParticipated())
                        .pollsCreated(p.getPollsCreated())
                        .lastActive(p.getLastActive())
                        .lastUpdated(p.getLastUpdated())
                        .build());
    }



    private ActivePollDashboardResponse toActivePollResponse(AnalyticsPollSummary s) {
        return ActivePollDashboardResponse.builder()
                .pollId(s.getPollId())
                .title(s.getTitle())
                .creatorId(s.getCreatorId())
                .creatorName(s.getCreatorName())
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .expiresAt(s.getExpiresAt())
                .totalVotes(s.getTotalVotes())
                .uniqueVoters(s.getUniqueVoters())
                .participationRate(s.getParticipationRate())
                .lastUpdated(s.getLastUpdated())
                .build();
    }

    private RecentResultResponse toRecentResultResponse(
            AnalyticsPollSummary s, List<AnalyticsOptionBreakdown> options) {

        WinningOptionResponse winner = deriveWinner(options);
        return RecentResultResponse.builder()
                .pollId(s.getPollId())
                .title(s.getTitle())
                .creatorId(s.getCreatorId())
                .creatorName(s.getCreatorName())
                .status(s.getStatus())
                .totalVotes(s.getTotalVotes())
                .uniqueVoters(s.getUniqueVoters())
                .participationRate(s.getParticipationRate())
                .lastUpdated(s.getLastUpdated())
                .winningOption(winner)
                .build();
    }

    /**
     * Winner = highest vote_count; ties broken by lowest option_id.
     * Returns null when there are no votes (zero-vote poll).
     */
    private WinningOptionResponse deriveWinner(List<AnalyticsOptionBreakdown> options) {
        return options.stream()
                .filter(o -> o.getVoteCount() != null && o.getVoteCount() > 0)
                .max(Comparator.comparingLong(AnalyticsOptionBreakdown::getVoteCount)
                        .thenComparing(Comparator.comparingLong(AnalyticsOptionBreakdown::getOptionId).reversed()))
                .map(o -> WinningOptionResponse.builder()
                        .optionId(o.getOptionId())
                        .optionText(o.getOptionText())
                        .voteCount(o.getVoteCount())
                        .votePercentage(o.getVotePercentage())
                        .build())
                .orElse(null);
    }



    private boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }



    private long nullToZero(Long v) {
        return v == null ? 0L : v;
    }

    private double nullToZeroD(Double v) {
        return v == null ? 0.0 : v;
    }
}
