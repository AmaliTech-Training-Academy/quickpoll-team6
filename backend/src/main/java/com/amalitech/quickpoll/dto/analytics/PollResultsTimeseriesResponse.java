package com.amalitech.quickpoll.dto.analytics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PollResultsTimeseriesResponse {
    private Long pollId;
    private List<TimeseriesPointResponse> points;
}
