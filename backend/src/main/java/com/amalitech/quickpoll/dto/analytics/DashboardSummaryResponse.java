package com.amalitech.quickpoll.dto.analytics;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DashboardSummaryResponse {
    private long activePollCount;
    private long closedPollCount;
    private long totalPollCount;
    private long totalVotesCast;
    private double averageParticipationRate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastRefreshedAt;
}
