package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.service.PollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/polls")
@RequiredArgsConstructor
@Tag(name = "Polls", description = "Poll management endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class PollController {
    private final PollService pollService;

    @GetMapping
    @Operation(summary = "Get all polls", description = "Retrieve paginated list of all polls (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<PollResponse>> getAllPolls(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(pollService.getAllPolls(page, size));
    }

    @GetMapping("/my-polls")
    @Operation(summary = "Get my entitled polls", description = "Retrieve polls where the authenticated user is invited to participate")
    public ResponseEntity<Page<PollBasicResponse>> getMyEntitledPolls(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pollService.getEntitledPolls(user.getEmail(), page, size));
    }

    @GetMapping("/my-created-polls")
    @Operation(summary = "Get my created polls", description = "Retrieve polls created by the authenticated user")
    public ResponseEntity<Page<PollResponse>> getMyCreatedPolls(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pollService.getMyCreatedPolls(user, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get poll by ID", description = "Retrieve a specific poll by its ID")
    public ResponseEntity<PollResponse> getPollById(@PathVariable Long id) {
        return ResponseEntity.ok(pollService.getPollById(id));
    }

    @PostMapping
    @Operation(summary = "Create poll", description = "Create a new poll")
    public ResponseEntity<PollResponse> createPoll(
            @Valid @RequestBody PollRequest request,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(pollService.createPoll(request, creator));
    }

    @PutMapping("/{id}/close")
    @Operation(summary = "Close poll", description = "Close a poll to prevent further voting")
    public ResponseEntity<PollResponse> closePoll(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pollService.closePoll(id, user));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete poll", description = "Delete a poll by its ID")
    public ResponseEntity<Void> deletePoll(@PathVariable Long id, @AuthenticationPrincipal User user) {
        pollService.deletePoll(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/results")
    @Operation(summary = "Get poll results", description = "Retrieve poll results with vote counts and percentages (Creator or Admin only)")
    public ResponseEntity<PollResponse> getPollResults(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pollService.getPollResults(id, user));
    }
}
