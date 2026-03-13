package com.amalitech.quickpoll.model.analytics;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Read-only JPA entity backed by the analytics_poll_summary table.
 * Rows are managed exclusively by database triggers; never write via JPA.
 */
@Entity
@Immutable
@Table(name = "analytics_poll_summary")
@Getter
@Setter
@NoArgsConstructor
public class AnalyticsPollSummary {

    @Id
    @Column(name = "poll_id")
    private Long pollId;

    @Column(name = "creator_id")
    private Long creatorId;

    @Column(name = "title")
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "creator_name")
    private String creatorName;

    @Column(name = "status")
    private String status;

    @Column(name = "max_selections")
    private Integer maxSelections;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "total_votes")
    private Long totalVotes;

    @Column(name = "unique_voters")
    private Long uniqueVoters;

    @Column(name = "participation_rate")
    private BigDecimal participationRate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
