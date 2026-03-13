package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.analytics.AnalyticsOptionBreakdown;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PollAnalyticsRepository extends JpaRepository<AnalyticsOptionBreakdown, Long> {

    /** All options for a single poll, ordered for stable display. */
    List<AnalyticsOptionBreakdown> findByPollIdOrderByOptionIdAsc(Long pollId);

    /** Batch-load options for multiple polls (used by recent-results). */
    List<AnalyticsOptionBreakdown> findByPollIdIn(List<Long> pollIds);
}
