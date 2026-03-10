package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.event.*;
import com.amalitech.quickpoll.model.*;
import com.amalitech.quickpoll.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import com.amalitech.quickpoll.mapper.*;

@Service
@RequiredArgsConstructor
public class PollService {
    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final VoteRepository voteRepository;
    private final PollMapper pollMapper;
    private final ApplicationEventPublisher eventPublisher;

    public Page<PollResponse> getAllPolls(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return pollRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toResponse);
    }

    public PollResponse getPollById(Long id) {
        Poll poll = pollRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        return toResponse(poll);
    }

    @Transactional
    public PollResponse createPoll(PollRequest request, User creator) {
        Poll poll = pollMapper.toEntity(request, creator);
        poll = pollRepository.save(poll);

        for (String optionText : request.getOptions()) {
            PollOption option = pollMapper.toOptionEntity(optionText, poll);
            optionRepository.save(option);
        }
        
        Poll savedPoll = pollRepository.findById(poll.getId()).get();
        eventPublisher.publishEvent(new PollCreatedDomainEvent(savedPoll));
        
        return toResponse(savedPoll);
    }

    @Transactional
    public void vote(Long pollId, VoteRequest request, User voter) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        
        if (!poll.isActive()) {
            throw new RuntimeException("Poll is closed");
        }
        
        if (!poll.isMultiSelect() && voteRepository.existsByUserIdAndPollId(voter.getId(), pollId)) {
            throw new RuntimeException("Already voted on this poll");
        }
        
        for (Long optionId : request.getOptionIds()) {
            PollOption option = optionRepository.findById(optionId)
                    .orElseThrow(() -> new RuntimeException("Option not found"));
            
            if (!option.getPoll().getId().equals(pollId)) {
                throw new RuntimeException("Option does not belong to this poll");
            }
            
            Vote vote = new Vote();
            vote.setPoll(poll);
            vote.setOption(option);
            vote.setUser(voter);
            vote = voteRepository.save(vote);
            
            eventPublisher.publishEvent(new VoteCastDomainEvent(vote));
        }
    }

    @Transactional
    public PollResponse closePoll(Long pollId, User creator) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        
        if (!poll.getCreator().getId().equals(creator.getId())) {
            throw new RuntimeException("Only poll creator can close the poll");
        }
        
        poll.setActive(false);
        poll = pollRepository.save(poll);
        
        eventPublisher.publishEvent(new PollClosedDomainEvent(poll));
        
        return toResponse(poll);
    }

    private PollResponse toResponse(Poll poll) {
        List<PollOption> options = optionRepository.findByPollId(poll.getId());
        int totalVotes = options.stream()
                .mapToInt(o -> voteRepository.countByOptionId(o.getId()))
                .sum();

        List<OptionResponse> optionResponses = options.stream().map(o -> {
            int count = voteRepository.countByOptionId(o.getId());
            double percentage = totalVotes > 0 ? (count * 100.0 / totalVotes) : 0;
            return pollMapper.toOptionResponse(o, count, percentage);
        }).toList();

        return pollMapper.toResponse(poll, optionResponses, totalVotes);
    }
}
