package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.dto.VoteRequest;
import com.amalitech.quickpoll.dto.VoteResponse;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.service.VoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/votes")
@RequiredArgsConstructor
@Tag(name = "Votes", description = "Vote management endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class VoteController {
    private final VoteService voteService;

    @PostMapping("/polls/{pollId}")
    @Operation(summary = "Cast vote", description = "Cast vote(s) on a poll")
    public ResponseEntity<VoteResponse> castVote(
            @PathVariable Long pollId,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal User voter) {
        return ResponseEntity.ok(voteService.castVote(pollId, request, voter));
    }
}
