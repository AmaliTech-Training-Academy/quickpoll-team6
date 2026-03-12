package com.amalitech.quickpoll.event;

import com.amalitech.quickpoll.model.Poll;

public record PollCreatedDomainEvent(Poll poll) {}
