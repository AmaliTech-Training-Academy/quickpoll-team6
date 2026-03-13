package com.amalitech.quickpoll.model.analytics;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Read-only JPA entity backed by the analytics_votes_timeseries table.
 * Rows are managed exclusively by database triggers; never write via JPA.
 */
@Entity
@Immutable
@Table(name = "analytics_votes_timeseries")
@Getter
@Setter
@NoArgsConstructor
public class AnalyticsVotesTimeseries {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "poll_id")
    private Long pollId;

    @Column(name = "bucket_time")
    private LocalDateTime bucketTime;

    @Column(name = "votes_in_bucket")
    private Long votesInBucket;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;
}
