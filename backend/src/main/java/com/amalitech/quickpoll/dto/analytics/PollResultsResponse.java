package com.amalitech.quickpoll.dto.analytics;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PollResultsResponse {
    private Long pollId;
    private String title;
    private String description;
    private Long creatorId;
    private String creatorName;
    private String status;
    private Integer maxSelections;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;

    private Long totalVotes;
    private Long uniqueVoters;
    private BigDecimal participationRate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastUpdated;

    private List<PollResultOptionResponse> options;
}
