package com.amalitech.quickpoll.dto.analytics;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TopUserResponse {
    private Long userId;
    private String userName;
    private Long totalVotesCast;
    private Long pollsParticipated;
    private Long pollsCreated;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastActive;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastUpdated;
}
