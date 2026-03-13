package com.amalitech.quickpoll.model.analytics;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Read-only JPA entity backed by the analytics_option_breakdown table.
 * Rows are managed exclusively by database triggers; never write via JPA.
 */
@Entity
@Immutable
@Table(name = "analytics_option_breakdown")
@Getter
@Setter
@NoArgsConstructor
public class AnalyticsOptionBreakdown {

    @Id
    @Column(name = "option_id")
    private Long optionId;

    @Column(name = "poll_id")
    private Long pollId;

    @Column(name = "option_text")
    private String optionText;

    @Column(name = "vote_count")
    private Long voteCount;

    @Column(name = "vote_percentage")
    private BigDecimal votePercentage;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
