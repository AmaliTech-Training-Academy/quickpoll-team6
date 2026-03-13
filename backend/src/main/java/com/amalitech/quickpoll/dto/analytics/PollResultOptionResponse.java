package com.amalitech.quickpoll.dto.analytics;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PollResultOptionResponse {
    private Long optionId;
    private String optionText;
    private Long voteCount;
    private BigDecimal votePercentage;
}
