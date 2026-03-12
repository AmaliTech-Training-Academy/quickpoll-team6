package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.PollRequest;
import com.amalitech.quickpoll.mapper.PollMapper;
import com.amalitech.quickpoll.mapper.PollOptionMapper;
import com.amalitech.quickpoll.model.Poll;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PollServiceTest {

    @Mock private PollRepository pollRepository;
    @Mock private PollOptionRepository optionRepository;
    @Mock private PollMapper pollMapper;
    @Mock private PollOptionMapper pollOptionMapper;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private PollInviteRepository pollInviteRepository;
    @Mock private VoteRepository voteRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PollService pollService;

    // ── helpers ──────────────────────────────────────────────────────────────

    private PollRequest buildRequest(List<String> options, int maxSelections) {
        PollRequest req = new PollRequest();
        req.setQuestion("Test question?");
        req.setDescription("desc");
        req.setOptions(options);
        req.setMaxSelections(maxSelections);
        req.setAnonymous(false);
        req.setDepartmentIds(List.of(1L));
        req.setExpiresAt(LocalDateTime.now().plusDays(7));
        return req;
    }

    private User creator() {
        User u = new User();
        u.setId(1L);
        u.setEmail("creator@example.com");
        return u;
    }

    // ── maxSelections validation ──────────────────────────────────────────────

    @Test
    void createPoll_MaxSelectionsExceedsOptions_ThrowsIllegalArgument() {
        // 4 options, maxSelections = 5  → should fail
        PollRequest request = buildRequest(List.of("Java", "Python", "JavaScript", "Go"), 5);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> pollService.createPoll(request, creator())
        );

        assertTrue(ex.getMessage().contains("Maximum selections cannot exceed"));
        // nothing should be saved
        verify(pollRepository, never()).save(any());
    }

    @Test
    void createPoll_MaxSelectionsEqualsOptions_Succeeds() {
        // 4 options, maxSelections = 4  → boundary: exactly equal, should be fine
        List<String> options = List.of("Java", "Python", "JavaScript", "Go");
        PollRequest request = buildRequest(options, 4);
        User creator = creator();

        Poll mockPoll = new Poll();
        mockPoll.setId(1L);
        when(pollMapper.toEntity(request, creator)).thenReturn(mockPoll);
        when(pollRepository.save(any(Poll.class))).thenReturn(mockPoll);
        when(optionRepository.saveAll(any())).thenReturn(List.of());
        when(departmentRepository.findAllByIdInWithMembers(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> pollService.createPoll(request, creator));
        verify(pollRepository).save(any());
    }

    @Test
    void createPoll_MaxSelectionsLessThanOne_ThrowsIllegalArgument() {
        PollRequest request = buildRequest(List.of("Java", "Python"), 0);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> pollService.createPoll(request, creator())
        );

        assertTrue(ex.getMessage().contains("at least 1"));
        verify(pollRepository, never()).save(any());
    }

    @Test
    void createPoll_ValidMaxSelections_Succeeds() {
        List<String> options = List.of("Java", "Python", "Go");
        PollRequest request = buildRequest(options, 2);
        User creator = creator();

        Poll mockPoll = new Poll();
        mockPoll.setId(1L);
        when(pollMapper.toEntity(request, creator)).thenReturn(mockPoll);
        when(pollRepository.save(any(Poll.class))).thenReturn(mockPoll);
        when(optionRepository.saveAll(any())).thenReturn(List.of());
        when(departmentRepository.findAllByIdInWithMembers(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> pollService.createPoll(request, creator));
        verify(pollRepository).save(any());
    }
}
