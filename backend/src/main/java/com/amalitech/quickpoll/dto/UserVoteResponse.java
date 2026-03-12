package com.amalitech.quickpoll.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserVoteResponse {
    private Long voteId;
    private Long pollId;
    private String pollQuestion;
    private Long optionId;
    private String optionText;
    private LocalDateTime votedAt;
}
