package com.amalitech.quickpoll.event;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PollEvent(
    @JsonProperty("event_type") String eventType,
    @JsonProperty("poll_id") Long pollId,
    @JsonProperty("creator_id") Long creatorId,
    @JsonProperty("occurred_at") String occurredAt,
    @JsonProperty("title") String title,
    @JsonProperty("question") String question,
    @JsonProperty("multi_select") Boolean multiSelect,
    @JsonProperty("expires_at") String expiresAt,
    @JsonProperty("active") Boolean active,
    @JsonProperty("created_at") String createdAt
) {}
