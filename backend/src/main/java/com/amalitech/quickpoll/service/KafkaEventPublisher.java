package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.event.*;
import com.amalitech.quickpoll.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.vote-events}")
    private String voteEventsTopic;

    @Value("${app.kafka.topics.poll-events}")
    private String pollEventsTopic;

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleVoteCast(VoteCastDomainEvent domainEvent) {
        Vote vote = domainEvent.vote();
        VoteCastEvent event = new VoteCastEvent(
            "VOTE_CAST",
            vote.getId(),
            vote.getPoll().getId(),
            vote.getOption().getId(),
            vote.getUser().getId(),
            vote.getCreatedAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
        );
        kafkaTemplate.send(voteEventsTopic, String.valueOf(vote.getPoll().getId()), event);
        log.info("Published VOTE_CAST event for vote_id={}, poll_id={}", vote.getId(), vote.getPoll().getId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePollCreated(PollCreatedDomainEvent domainEvent) {
        Poll poll = domainEvent.poll();
        PollEvent event = new PollEvent(
            "POLL_CREATED",
            poll.getId(),
            poll.getCreator().getId(),
            poll.getCreatedAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER),
            poll.getQuestion(),
            poll.getQuestion(),
            poll.isMultiSelect(),
            poll.getExpiresAt() != null ? poll.getExpiresAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER) : null,
            poll.isActive(),
            poll.getCreatedAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
        );
        kafkaTemplate.send(pollEventsTopic, String.valueOf(poll.getId()), event);
        log.info("Published POLL_CREATED event for poll_id={}", poll.getId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePollClosed(PollClosedDomainEvent domainEvent) {
        Poll poll = domainEvent.poll();
        PollEvent event = new PollEvent(
            "POLL_CLOSED",
            poll.getId(),
            poll.getCreator().getId(),
            poll.getCreatedAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER),
            poll.getQuestion(),
            poll.getQuestion(),
            poll.isMultiSelect(),
            poll.getExpiresAt() != null ? poll.getExpiresAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER) : null,
            poll.isActive(),
            poll.getCreatedAt().atOffset(ZoneOffset.UTC).format(ISO_FORMATTER)
        );
        kafkaTemplate.send(pollEventsTopic, String.valueOf(poll.getId()), event);
        log.info("Published POLL_CLOSED event for poll_id={}", poll.getId());
    }
}
