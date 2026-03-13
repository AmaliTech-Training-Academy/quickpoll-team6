package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.PollBasicResponse;
import com.amalitech.quickpoll.dto.PollRequest;
import com.amalitech.quickpoll.mapper.PollMapper;
import com.amalitech.quickpoll.mapper.PollOptionMapper;
import com.amalitech.quickpoll.model.Poll;
import com.amalitech.quickpoll.model.PollOption;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;


import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    @Mock private DashboardRepository dashboardRepository;
    @Mock private PollAnalyticsRepository pollAnalyticsRepository;
    @Mock private TimeseriesRepository timeseriesRepository;
    @Mock private jakarta.persistence.EntityManager entityManager;
    @Mock private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;


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

    // ── expiresAt validation ────────────────────────────────────────────────

    @Test
    void createPoll_ExpiresAtInPast_ThrowsIllegalArgument() {
        PollRequest request = buildRequest(List.of("A", "B"), 1);
        request.setExpiresAt(LocalDateTime.now().minusDays(1));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> pollService.createPoll(request, creator())
        );

        assertTrue(ex.getMessage().contains("future"));
        verify(pollRepository, never()).save(any());
    }

    // ── getEntitledPolls – hasVoted flag ──────────────────────────────────────

    private Poll buildPollWithOptions(Long id) {
        User c = creator();
        Poll poll = new Poll();
        poll.setId(id);
        poll.setQuestion("Question " + id);
        poll.setDescription("Desc");
        poll.setCreator(c);
        poll.setActive(true);
        poll.setMaxSelections(1);
        poll.setCreatedAt(LocalDateTime.now());

        PollOption opt = new PollOption();
        opt.setId(id * 10);
        opt.setOptionText("Option A");
        opt.setPoll(poll);
        poll.setOptions(List.of(opt));

        return poll;
    }

    @Test
    void getEntitledPolls_MarksVotedPollsCorrectly() {
        String email = "voter@example.com";
        Poll poll1 = buildPollWithOptions(1L);
        Poll poll2 = buildPollWithOptions(2L);
        Poll poll3 = buildPollWithOptions(3L);

        PageImpl<Poll> page = new PageImpl<>(List.of(poll1, poll2, poll3), PageRequest.of(0, 10), 3);
        when(pollRepository.findEntitledPollsByEmail(eq(email), any())).thenReturn(page);
        when(pollRepository.findAllByIdInWithOptions(List.of(1L, 2L, 3L)))
                .thenReturn(List.of(poll1, poll2, poll3));
        when(pollInviteRepository.findVotedPollIdsByEmailAndPollIds(eq(email), eq(List.of(1L, 2L, 3L))))
                .thenReturn(List.of(1L, 3L));

        Page<PollBasicResponse> result = pollService.getEntitledPolls(email, 0, 10);

        assertEquals(3, result.getContent().size());

        PollBasicResponse resp1 = result.getContent().get(0);
        PollBasicResponse resp2 = result.getContent().get(1);
        PollBasicResponse resp3 = result.getContent().get(2);

        assertTrue(resp1.isHasVoted(), "Poll 1 should be marked as voted");
        assertFalse(resp2.isHasVoted(), "Poll 2 should not be marked as voted");
        assertTrue(resp3.isHasVoted(), "Poll 3 should be marked as voted");
    }

    @Test
    void getEntitledPolls_NoVotes_AllMarkedAsNotVoted() {
        String email = "newuser@example.com";
        Poll poll1 = buildPollWithOptions(1L);

        PageImpl<Poll> page = new PageImpl<>(List.of(poll1), PageRequest.of(0, 10), 1);
        when(pollRepository.findEntitledPollsByEmail(eq(email), any())).thenReturn(page);
        when(pollRepository.findAllByIdInWithOptions(List.of(1L))).thenReturn(List.of(poll1));
        when(pollInviteRepository.findVotedPollIdsByEmailAndPollIds(eq(email), eq(List.of(1L))))
                .thenReturn(List.of());

        Page<PollBasicResponse> result = pollService.getEntitledPolls(email, 0, 10);

        assertEquals(1, result.getContent().size());
        assertFalse(result.getContent().get(0).isHasVoted());
    }

    @Test
    void getEntitledPolls_EmptyPage_ReturnsEmpty() {
        String email = "nobody@example.com";
        PageImpl<Poll> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(pollRepository.findEntitledPollsByEmail(eq(email), any())).thenReturn(emptyPage);

        Page<PollBasicResponse> result = pollService.getEntitledPolls(email, 0, 10);

        assertTrue(result.getContent().isEmpty());
        verify(pollInviteRepository, never()).findVotedPollIdsByEmailAndPollIds(any(), any());
    }
}
