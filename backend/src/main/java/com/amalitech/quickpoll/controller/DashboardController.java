package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.dto.analytics.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Analytics dashboard endpoints for creators and admins")
@SecurityRequirement(name = "Bearer Authentication")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(
            summary = "Dashboard KPI summary",
            description = "Returns KPI cards: active/closed poll counts, total votes, average participation rate. " +
                          "Admin sees global stats; creator sees own polls only.")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getDashboardSummary(user));
    }

    @GetMapping("/active-polls")
    @Operation(
            summary = "Active polls list",
            description = "Paginated list of currently active polls drawn from OLAP. " +
                          "Admin sees all; creator sees own active polls.")
    public ResponseEntity<Page<ActivePollDashboardResponse>> getActivePolls(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getActivePolls(user, page, size));
    }

    @GetMapping("/recent-results")
    @Operation(
            summary = "Recent poll results",
            description = "Paginated list of recently updated polls with their current winning option. " +
                          "Admin sees all; creator sees own polls.")
    public ResponseEntity<Page<RecentResultResponse>> getRecentResults(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getRecentResults(user, page, size));
    }

    @GetMapping("/top-users")
    @Operation(
            summary = "Top users leaderboard",
            description = "Admin-only engagement leaderboard ordered by votes cast then last activity.")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TopUserResponse>> getTopUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getTopUsers(user, page, size));
    }
}
