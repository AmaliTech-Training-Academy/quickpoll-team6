package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.event.PollClosedDomainEvent;
import com.amalitech.quickpoll.event.PollCreatedDomainEvent;
import com.amalitech.quickpoll.mapper.PollMapper;
import com.amalitech.quickpoll.mapper.PollOptionMapper;
import com.amalitech.quickpoll.model.*;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
    private final ApplicationEventPublisher eventPublisher;

    public Page<PollResponse> getAllPolls(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Poll> polls = pollRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<Long> pollIds = polls.getContent().stream().map(Poll::getId).toList();
        List<Poll> pollsWithOptions = pollRepository.findAllByIdInWithOptions(pollIds);
        return new PageImpl<>(pollsWithOptions.stream().map(this::toResponse).toList(), pageable, polls.getTotalElements());
    }

    public PollResponse getPollById(Long id) {
        Poll poll = pollRepository.findByIdWithOptions(id)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));
        return toResponse(poll);
    }

    @Transactional
    public PollResponse createPoll(PollRequest request, User creator) {
        log.info("Received poll creation request: {}", request.toString());
        if (request.getMaxSelections() < 1) {
            throw new IllegalArgumentException("Maximum selections must be at least 1");
        }
        
        Poll poll = pollMapper.toEntity(request, creator);
        log.info("Creating poll: {}", poll);
        Poll savedPoll = pollRepository.save(poll);

        List<PollOption> options = request.getOptions().stream()
                .map(optionText -> {
                    PollOption option = new PollOption();
                    option.setOptionText(optionText);
                    option.setPoll(savedPoll);
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
                        .poll(savedPoll)
                        .departmentMember(member)
                        .build())
                .toList();
        log.info("Created {} poll invites", invites.size());
        pollInviteRepository.saveAll(invites);

        eventPublisher.publishEvent(new PollCreatedDomainEvent(savedPoll));

        return toResponse(savedPoll);
    }

    public PollResponse closePoll(Long pollId, User user) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can close this poll");
        }

        if (!poll.isActive()) {
            throw new IllegalStateException("Poll is already closed");
        }

        poll.setActive(false);
        Poll closedPoll = pollRepository.save(poll);
        
        eventPublisher.publishEvent(new PollClosedDomainEvent(closedPoll));
        
        return toResponse(closedPoll);
    }

    public Boolean deletePoll(Long pollId, User user) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can delete this poll");
        }

        pollRepository.delete(poll);
        return true;
    }

    public PollResponse getPollResults(Long pollId, User user) {
        Poll poll = pollRepository.findByIdWithOptions(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));
        
        if (!poll.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the creator or admin can view poll results");
        }
        
        return toResponse(poll);
    }

    public Page<PollBasicResponse> getEntitledPolls(String email, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return pollRepository.findEntitledPollsByEmail(email, pageable)
                .map(this::toBasicResponse);
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

        PollResponse response = pollMapper.toResponse(poll);
        response.setTotalVotes(totalVotes);
        response.setOptions(optionResponses);
        return response;
    }

    private PollBasicResponse toBasicResponse(Poll poll) {
        List<OptionBasicResponse> optionResponses = poll.getOptions().stream()
                .map(o -> new OptionBasicResponse(o.getId(), o.getOptionText()))
                .toList();

        PollBasicResponse response = new PollBasicResponse();
        response.setId(poll.getId());
        response.setQuestion(poll.getQuestion());
        response.setDescription(poll.getDescription());
        response.setCreatorName(poll.getCreator().getFullName());
        response.setMaxSelections(poll.getMaxSelections());
        response.setExpiresAt(poll.getExpiresAt());
        response.setStatus(poll.isActive() ? "ACTIVE" : "CLOSED");
        response.setCreatedAt(poll.getCreatedAt());
        response.setOptions(optionResponses);
        return response;
    }
}
