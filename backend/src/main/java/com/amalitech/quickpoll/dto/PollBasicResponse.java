package com.amalitech.quickpoll.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PollBasicResponse {
    private Long id;
    private String title;
    private String question;
    private String description;
    private String creatorName;
    private boolean multipleChoice;
    private LocalDateTime expiresAt;
    private String status;
    private LocalDateTime createdAt;
    private List<OptionBasicResponse> options;
}
