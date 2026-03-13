package com.amalitech.quickpoll.dto.analytics;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class RecentResultResponse {
    private Long pollId;
    private String title;
    private Long creatorId;
    private String creatorName;
    private String status;
    private Long totalVotes;
    private Long uniqueVoters;
    private BigDecimal participationRate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastUpdated;

    /** Nullable — a poll with zero votes has no winner. */
    private WinningOptionResponse winningOption;
}
