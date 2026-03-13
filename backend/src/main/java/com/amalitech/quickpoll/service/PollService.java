package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.dto.analytics.*;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.errorhandlers.PollAlreadyClosedException;

import com.amalitech.quickpoll.mapper.PollMapper;
import com.amalitech.quickpoll.mapper.PollOptionMapper;
import com.amalitech.quickpoll.model.*;
import com.amalitech.quickpoll.model.analytics.AnalyticsOptionBreakdown;
import com.amalitech.quickpoll.model.analytics.AnalyticsPollSummary;
import com.amalitech.quickpoll.model.analytics.AnalyticsVotesTimeseries;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class PollService {
    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final PollMapper pollMapper;
    private final PollOptionMapper pollOptionMapper;
    private final DepartmentRepository departmentRepository;
    private final PollInviteRepository pollInviteRepository;
    private final VoteRepository voteRepository;

    private final DashboardRepository dashboardRepository;
    private final PollAnalyticsRepository pollAnalyticsRepository;
    private final TimeseriesRepository timeseriesRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;

    public Page<PollResponse> getAllPolls(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Poll> polls = pollRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<Long> pollIds = polls.getContent().stream().map(Poll::getId).toList();

        List<Poll> pollsWithOptions = pollRepository.findAllByIdInWithOptions(pollIds);

        List<Poll> pollsWithInvites = pollRepository.findAllByIdInWithInvites(pollIds);
        Map<Long, List<PollInvite>> invitesByPollId = pollsWithInvites.stream()
                .collect(java.util.stream.Collectors.toMap(Poll::getId, Poll::getInvites));

        pollsWithOptions.forEach(p -> p.setInvites(invitesByPollId.getOrDefault(p.getId(), List.of())));

        Map<Long, Poll> pollMap = pollsWithOptions.stream()
                .collect(java.util.stream.Collectors.toMap(Poll::getId, p -> p));

        List<PollResponse> responses = polls.getContent().stream()
                .map(p -> pollMap.getOrDefault(p.getId(), p))
                .map(this::toResponse)
                .toList();

        return new PageImpl<>(responses, pageable, polls.getTotalElements());
    }

    public Page<PollResponse> getMyCreatedPolls(User creator, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Poll> polls = pollRepository.findByCreatorOrderByCreatedAtDesc(creator, pageable);
        List<Long> pollIds = polls.getContent().stream().map(Poll::getId).toList();

        if (pollIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Poll> pollsWithOptions = pollRepository.findAllByIdInWithOptions(pollIds);

        List<Poll> pollsWithInvites = pollRepository.findAllByIdInWithInvites(pollIds);
        Map<Long, List<PollInvite>> invitesByPollId = pollsWithInvites.stream()
                .collect(java.util.stream.Collectors.toMap(Poll::getId, Poll::getInvites));

        pollsWithOptions.forEach(p -> p.setInvites(invitesByPollId.getOrDefault(p.getId(), List.of())));

        Map<Long, Poll> pollMap = pollsWithOptions.stream()
                .collect(java.util.stream.Collectors.toMap(Poll::getId, p -> p));

        List<PollResponse> responses = polls.getContent().stream()
                .map(p -> pollMap.getOrDefault(p.getId(), p))
                .map(this::toResponse)
                .toList();

        return new PageImpl<>(responses, pageable, polls.getTotalElements());
    }

    public PollResponse getPollById(Long id) {
        Poll poll = pollRepository.findByIdWithOptions(id)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));
        pollRepository.findByIdWithInvites(id)
                .ifPresent(p -> poll.setInvites(p.getInvites()));
        return toResponse(poll);
    }

    @Transactional
    public PollResponse createPoll(PollRequest request, User creator) {
        log.info("Received poll creation request: {}", request.toString());
        if (request.getMaxSelections() < 1) {
            throw new IllegalArgumentException("Maximum selections must be at least 1");
        }
        if (request.getMaxSelections() > request.getOptions().size()) {
            throw new IllegalArgumentException(
                    "Maximum selections cannot exceed the number of options (" + request.getOptions().size() + ")");
        }
        if (request.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Expiration time must be in the future");
        }

        Poll poll = pollMapper.toEntity(request, creator);
        log.info("Creating poll: {}", poll);
        Poll savedPoll = pollRepository.save(poll);

        final Poll finalPoll = savedPoll;
        List<PollOption> options = request.getOptions().stream()
                .map(optionText -> {
                    PollOption option = new PollOption();
                    option.setOptionText(optionText);
                    option.setPoll(finalPoll);
                    return option;
                })
                .toList();
        List<PollOption> savedOptions = optionRepository.saveAll(options);
        savedPoll.setOptions(savedOptions);

        List<Department> departments = departmentRepository.findAllByIdInWithMembers(request.getDepartmentIds());
        log.info("Found {} departments for IDs: {}", departments.size(), request.getDepartmentIds());

        List<PollInvite> invites = departments.stream()
                .flatMap(department -> {
                    log.info("Department '{}' has {} members", department.getName(), department.getMembers().size());
                    return department.getMembers().stream();
                })
                .map(member -> PollInvite.builder()
                        .poll(finalPoll)
                        .departmentMember(member)
                        .invitedAt(LocalDateTime.now())
                        .voteStatus(com.amalitech.quickpoll.model.enums.VoteStatus.PENDING)
                        .build())
                .toList();
        log.info("Created {} poll invites", invites.size());
        
        entityManager.flush();

        int[] result = jdbcTemplate.batchUpdate(
            "INSERT INTO poll_invites (poll_id, department_member_id, invited_at, vote_status) VALUES (?, ?, ?, ?)",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    PollInvite invite = invites.get(i);
                    ps.setLong(1, invite.getPoll().getId());
                    ps.setLong(2, invite.getDepartmentMember().getId());
                    ps.setTimestamp(3, Timestamp.valueOf(invite.getInvitedAt()));
                    ps.setString(4, invite.getVoteStatus().name());
                }

                @Override
                public int getBatchSize() {
                    return invites.size();
                }
            }
        );

        log.info("Batch results: {}", Arrays.toString(result));
        
        Poll refreshedPoll = pollRepository.findById(savedPoll.getId()).orElse(savedPoll);
        
        PollResponse response = pollMapper.toResponse(refreshedPoll);
        if (response == null) {
            response = new PollResponse();
        }
        
        List<OptionResponse> optionResponses = options.stream().map(o -> {
            OptionResponse optResp = pollOptionMapper.toResponse(o);
            if (optResp == null) {
                optResp = new OptionResponse();
                optResp.setId(o.getId());
                optResp.setText(o.getOptionText());
            }
            optResp.setVoteCount(0);
            optResp.setPercentage(0.0);
            return optResp;
        }).toList();
        
        List<String> invitedDepartments = invites.stream()
                .map(invite -> invite.getDepartmentMember().getDepartment().getName())
                .distinct()
                .toList();

        response.setTotalVotes(0);
        response.setOptions(optionResponses);
        response.setInvitedDepartments(invitedDepartments);
        
        return response;
    }

    public PollResponse closePoll(Long pollId, User user) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can close this poll");
        }

        if (!poll.isActive()) {
            throw new PollAlreadyClosedException("Poll is already closed");
        }

        poll.setActive(false);
        Poll closedPoll = pollRepository.save(poll);
        return toResponse(closedPoll);
    }

    @Transactional
    public Boolean deletePoll(Long pollId, User user) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can delete this poll");
        }

        voteRepository.deleteByPollId(pollId);
        optionRepository.deleteByPollId(pollId);
        pollInviteRepository.deleteByPollId(pollId);
        pollRepository.deleteById(pollId);
        return true;
    }

    public PollResponse getPollResults(Long pollId, User user) {
        Poll poll = pollRepository.findByIdWithOptions(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));
        pollRepository.findByIdWithInvites(pollId)
                .ifPresent(p -> poll.setInvites(p.getInvites()));

        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can view poll results");
        }

        return toResponse(poll);
    }



    /**
     * Returns rich poll results (summary + per-option breakdown) from the OLAP
     * analytics tables.
     *
     * Access: admin, creator, or an entitled participant (has a poll_invite row).
     */
    public PollResultsResponse getPollAnalyticsResults(Long pollId, User user) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        boolean isAdmin   = user.getRole() == Role.ADMIN;
        boolean isCreator = poll.getCreator().getId().equals(user.getId());
        boolean isEntitled = pollInviteRepository
                .findByPollIdAndMemberEmail(pollId, user.getEmail()).isPresent();

        if (!isAdmin && !isCreator && !isEntitled) {
            throw new AccessDeniedException("You are not entitled to view results for this poll");
        }

        AnalyticsPollSummary summary = dashboardRepository.findByPollId(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Analytics summary not found for poll " + pollId));

        List<AnalyticsOptionBreakdown> options =
                pollAnalyticsRepository.findByPollIdOrderByOptionIdAsc(pollId);

        List<PollResultOptionResponse> optionDtos = options.stream()
                .map(o -> PollResultOptionResponse.builder()
                        .optionId(o.getOptionId())
                        .optionText(o.getOptionText())
                        .voteCount(o.getVoteCount())
                        .votePercentage(o.getVotePercentage())
                        .build())
                .toList();

        return PollResultsResponse.builder()
                .pollId(summary.getPollId())
                .title(summary.getTitle())
                .description(summary.getDescription())
                .creatorId(summary.getCreatorId())
                .creatorName(summary.getCreatorName())
                .status(summary.getStatus())
                .maxSelections(summary.getMaxSelections())
                .createdAt(summary.getCreatedAt())
                .expiresAt(summary.getExpiresAt())
                .totalVotes(summary.getTotalVotes())
                .uniqueVoters(summary.getUniqueVoters())
                .participationRate(summary.getParticipationRate())
                .lastUpdated(summary.getLastUpdated())
                .options(optionDtos)
                .build();
    }

    /**
     * Returns hourly vote timeseries for a single poll with optional date-range
     * filtering.
     *
     * Access: same rules as {@link #getPollAnalyticsResults}.
     */
    public PollResultsTimeseriesResponse getPollTimeseries(
            Long pollId, User user, LocalDateTime from, LocalDateTime to) {

        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        boolean isAdmin   = user.getRole() == Role.ADMIN;
        boolean isCreator = poll.getCreator().getId().equals(user.getId());
        boolean isEntitled = pollInviteRepository
                .findByPollIdAndMemberEmail(pollId, user.getEmail()).isPresent();

        if (!isAdmin && !isCreator && !isEntitled) {
            throw new AccessDeniedException("You are not entitled to view timeseries for this poll");
        }

        List<AnalyticsVotesTimeseries> rows =
                timeseriesRepository.findByPollIdAndOptionalRange(pollId, from, to);

        List<TimeseriesPointResponse> points = rows.stream()
                .map(r -> TimeseriesPointResponse.builder()
                        .bucketTime(r.getBucketTime())
                        .votesInBucket(r.getVotesInBucket())
                        .build())
                .toList();

        return PollResultsTimeseriesResponse.builder()
                .pollId(pollId)
                .points(points)
                .build();
    }

    public Page<PollBasicResponse> getEntitledPolls(String email, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Poll> polls = pollRepository.findEntitledPollsByEmail(email, pageable);
        List<Long> pollIds = polls.getContent().stream().map(Poll::getId).toList();

        if (pollIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Poll> pollsWithOptions = pollRepository.findAllByIdInWithOptions(pollIds);
        Map<Long, Poll> pollMap = pollsWithOptions.stream()
                .collect(java.util.stream.Collectors.toMap(Poll::getId, p -> p));

        List<Long> votedPollIds = pollInviteRepository.findVotedPollIdsByEmailAndPollIds(email, pollIds);
        java.util.Set<Long> votedSet = new java.util.HashSet<>(votedPollIds);

        List<PollBasicResponse> responses = polls.getContent().stream()
                .map(p -> pollMap.getOrDefault(p.getId(), p))
                .map(p -> toBasicResponse(p, votedSet.contains(p.getId())))
                .toList();

        return new PageImpl<>(responses, pageable, polls.getTotalElements());
    }

    private PollResponse toResponse(Poll poll) {
        List<PollOption> options = poll.getOptions();
        int totalVotes = options.stream().mapToInt(PollOption::getVoteCount).sum();

        List<OptionResponse> optionResponses = options.stream().map(o -> {
            int count = o.getVoteCount();
            OptionResponse response = pollOptionMapper.toResponse(o);
            response.setVoteCount(count);
            response.setPercentage(totalVotes > 0 ? (count * 100.0 / totalVotes) : 0);
            return response;
        }).toList();

        List<String> invitedDepartments = poll.getInvites().stream()
                .map(invite -> invite.getDepartmentMember().getDepartment().getName())
                .distinct()
                .toList();

        PollResponse response = pollMapper.toResponse(poll);
        if (response == null) {
            response = new PollResponse();
        }
        response.setTotalVotes(totalVotes);
        response.setOptions(optionResponses);
        response.setInvitedDepartments(invitedDepartments);
        return response;
    }

    private PollBasicResponse toBasicResponse(Poll poll, boolean hasVoted) {
        List<OptionBasicResponse> optionResponses = poll.getOptions().stream()
                .map(o -> new OptionBasicResponse(o.getId(), o.getOptionText()))
                .toList();

        PollBasicResponse response = new PollBasicResponse();
        response.setId(poll.getId());
        response.setQuestion(poll.getQuestion());
        response.setDescription(poll.getDescription());
        response.setCreatorEmail(poll.getCreator().getEmail());
        response.setCreatorName(poll.getCreator().getFullName());
        response.setMaxSelections(poll.getMaxSelections());
        response.setExpiresAt(poll.getExpiresAt());
        response.setStatus(poll.isActive() ? "ACTIVE" : "CLOSED");
        response.setCreatedAt(poll.getCreatedAt());
        response.setOptions(optionResponses);
        response.setHasVoted(hasVoted);
        return response;
    }
}
