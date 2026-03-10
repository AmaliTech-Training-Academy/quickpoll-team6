package com.amalitech.quickpoll.event;

import com.fasterxml.jackson.annotation.JsonProperty;

public record VoteCastEvent(
    @JsonProperty("event_type") String eventType,
    @JsonProperty("vote_id") Long voteId,
    @JsonProperty("poll_id") Long pollId,
    @JsonProperty("option_id") Long optionId,
    @JsonProperty("user_id") Long userId,
    @JsonProperty("voted_at") String votedAt
) {}
