package com.amalitech.quickpoll.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class VoteResponse {
    private Boolean success;
    private String message;
}
