package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.errorhandlers.AlreadyVotedException;
import com.amalitech.quickpoll.errorhandlers.PollAlreadyClosedException;
import com.amalitech.quickpoll.dto.UserVoteResponse;
import com.amalitech.quickpoll.dto.VoteRequest;
import com.amalitech.quickpoll.dto.VoteResponse;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.event.VoteCastDomainEvent;
import com.amalitech.quickpoll.model.*;
import com.amalitech.quickpoll.model.enums.VoteStatus;
import com.amalitech.quickpoll.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VoteService {
    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final VoteRepository voteRepository;
    private final PollInviteRepository pollInviteRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public VoteResponse castVote(Long pollId, VoteRequest request, User voter) {
        Poll poll = pollRepository.findByIdWithOptions(pollId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found"));

        if (!poll.isActive()) {
            throw new PollAlreadyClosedException("Poll is closed and no longer accepting votes");
        }

        PollInvite pollInvite = pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())
                .orElseThrow(() -> new AccessDeniedException("You are not invited to vote on this poll"));

        // Check if user has already voted
        if (pollInvite.getVoteStatus() == VoteStatus.VOTED) {
            throw new AlreadyVotedException("You have already voted on this poll");
        }

        if (request.getOptionIds().size() > poll.getMaxSelections()) {
            throw new IllegalArgumentException("Cannot select more than " + poll.getMaxSelections() + " options");
        }

        List<PollOption> options = optionRepository.findAllById(request.getOptionIds());
        if (options.size() != request.getOptionIds().size()) {
            throw new ResourceNotFoundException("One or more options not found");
        }

        boolean allOptionsValid = options.stream().allMatch(o -> o.getPoll().getId().equals(pollId));
        if (!allOptionsValid) {
            throw new IllegalArgumentException("All options must belong to this poll");
        }

        List<Vote> votes = options.stream()
                .map(option -> {
                    Vote vote = new Vote();
                    vote.setPoll(poll);
                    vote.setOption(option);
                    vote.setUser(voter);
                    return vote;
                })
                .toList();

        List<Vote> savedVotes = voteRepository.saveAll(votes);
        
        // Update poll invite status to VOTED
        pollInvite.setVoteStatus(VoteStatus.VOTED);
        pollInviteRepository.save(pollInvite);
        
        savedVotes.forEach(vote -> eventPublisher.publishEvent(new VoteCastDomainEvent(vote)));

        return new VoteResponse(true, "Vote cast successfully");
    }

    public Page<UserVoteResponse> getMyVotes(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return voteRepository.findByUserIdWithDetails(user.getId(), pageable)
                .map(vote -> UserVoteResponse.builder()
                        .voteId(vote.getId())
                        .pollId(vote.getPoll().getId())
                        .pollQuestion(vote.getPoll().getQuestion())
                        .optionId(vote.getOption().getId())
                        .optionText(vote.getOption().getOptionText())
                        .votedAt(vote.getCreatedAt())
                        .build());
    }
}
