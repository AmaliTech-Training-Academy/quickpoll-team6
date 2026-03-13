package com.amalitech.quickpoll.model.analytics;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Read-only JPA entity backed by the analytics_user_participation table.
 * Rows are managed exclusively by database triggers; never write via JPA.
 */
@Entity
@Immutable
@Table(name = "analytics_user_participation")
@Getter
@Setter
@NoArgsConstructor
public class AnalyticsUserParticipation {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "total_votes_cast")
    private Long totalVotesCast;

    @Column(name = "polls_participated")
    private Long pollsParticipated;

    @Column(name = "polls_created")
    private Long pollsCreated;

    @Column(name = "last_active")
    private LocalDateTime lastActive;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
