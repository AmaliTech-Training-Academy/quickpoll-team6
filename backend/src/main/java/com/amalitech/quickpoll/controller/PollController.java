package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.service.PollService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {
    private final PollService pollService;

    @GetMapping
    public ResponseEntity<Page<PollResponse>> getAllPolls(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(pollService.getAllPolls(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PollResponse> getPollById(@PathVariable Long id) {
        return ResponseEntity.ok(pollService.getPollById(id));
    }

    @PostMapping
    public ResponseEntity<PollResponse> createPoll(
            @Valid @RequestBody PollRequest request,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(pollService.createPoll(request, creator));
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<Void> vote(
            @PathVariable Long id,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal User voter) {
        pollService.vote(id, request, voter);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<PollResponse> closePoll(
            @PathVariable Long id,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(pollService.closePoll(id, creator));
    }
}
