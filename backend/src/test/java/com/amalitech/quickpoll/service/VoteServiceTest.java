package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.VoteRequest;
import com.amalitech.quickpoll.dto.VoteResponse;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.event.VoteCastDomainEvent;
import com.amalitech.quickpoll.model.*;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.model.enums.VoteStatus;
import com.amalitech.quickpoll.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoteServiceTest {

    @Mock
    private PollRepository pollRepository;

    @Mock
    private PollOptionRepository optionRepository;

    @Mock
    private VoteRepository voteRepository;

    @Mock
    private PollInviteRepository pollInviteRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private VoteService voteService;

    @Test
    void castVote_Success() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L, 2L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");
        voter.setRole(Role.USER);

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(true);
        poll.setMaxSelections(3);

        PollOption option1 = new PollOption();
        option1.setId(1L);
        option1.setPoll(poll);

        PollOption option2 = new PollOption();
        option2.setId(2L);
        option2.setPoll(poll);

        List<PollOption> options = List.of(option1, option2);

        PollInvite pollInvite = new PollInvite();
        pollInvite.setVoteStatus(VoteStatus.PENDING);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())).thenReturn(Optional.of(pollInvite));
        when(optionRepository.findAllById(request.getOptionIds())).thenReturn(options);
        when(voteRepository.saveAll(anyList())).thenReturn(List.of(new Vote(), new Vote()));

        VoteResponse result = voteService.castVote(pollId, request, voter);

        assertNotNull(result);
        assertTrue(result.getSuccess());
        assertEquals("Vote cast successfully", result.getMessage());
        verify(voteRepository).saveAll(anyList());
        verify(eventPublisher, times(2)).publishEvent(any(VoteCastDomainEvent.class));
    }

    @Test
    void castVote_PollNotFound() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L));

        User voter = new User();
        voter.setId(1L);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }

    @Test
    void castVote_PollClosed() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L));

        User voter = new User();
        voter.setId(1L);

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(false);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));

        assertThrows(IllegalStateException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }

    @Test
    void castVote_AlreadyVoted() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(true);

        PollInvite pollInvite = new PollInvite();
        pollInvite.setVoteStatus(VoteStatus.VOTED);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())).thenReturn(Optional.of(pollInvite));

        assertThrows(IllegalStateException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }

    @Test
    void castVote_ExceedsMaxSelections() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L, 2L, 3L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(true);
        poll.setMaxSelections(2);

        PollInvite pollInvite = new PollInvite();
        pollInvite.setVoteStatus(VoteStatus.PENDING);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())).thenReturn(Optional.of(pollInvite));

        assertThrows(IllegalArgumentException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }

    @Test
    void castVote_OptionNotFound() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L, 2L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(true);
        poll.setMaxSelections(3);

        PollInvite pollInvite = new PollInvite();
        pollInvite.setVoteStatus(VoteStatus.PENDING);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())).thenReturn(Optional.of(pollInvite));
        when(optionRepository.findAllById(request.getOptionIds())).thenReturn(List.of(new PollOption()));

        assertThrows(ResourceNotFoundException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }

    @Test
    void castVote_OptionNotBelongToPoll() {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");

        Poll poll = new Poll();
        poll.setId(pollId);
        poll.setActive(true);
        poll.setMaxSelections(3);

        Poll differentPoll = new Poll();
        differentPoll.setId(2L);

        PollOption option = new PollOption();
        option.setId(1L);
        option.setPoll(differentPoll);

        PollInvite pollInvite = new PollInvite();
        pollInvite.setVoteStatus(VoteStatus.PENDING);

        when(pollRepository.findByIdWithOptions(pollId)).thenReturn(Optional.of(poll));
        when(pollInviteRepository.findByPollIdAndMemberEmail(pollId, voter.getEmail())).thenReturn(Optional.of(pollInvite));
        when(optionRepository.findAllById(request.getOptionIds())).thenReturn(List.of(option));

        assertThrows(IllegalArgumentException.class, 
            () -> voteService.castVote(pollId, request, voter));
    }
}