package com.amalitech.quickpoll.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PollResponse {
    private Long id;
    private String question;
    private String description;
    private String creatorEmail;
    private String creatorName;
    private String status;
    private Integer maxSelections;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private int totalVotes;
    private List<String> invitedDepartments;
    private List<OptionResponse> options;
}
