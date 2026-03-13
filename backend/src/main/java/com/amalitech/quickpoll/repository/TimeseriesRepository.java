package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.analytics.AnalyticsVotesTimeseries;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TimeseriesRepository extends JpaRepository<AnalyticsVotesTimeseries, Long> {

    /**
     * Returns hourly vote buckets for a poll, with optional date-range filter.
     * Null parameters mean "no bound" (open-ended range).
     */
    @Query(value = """
            SELECT poll_id, bucket_time, votes_in_bucket, recorded_at, id
            FROM analytics_votes_timeseries
            WHERE poll_id = :pollId
              AND (:from IS NULL OR bucket_time >= :from)
              AND (:to   IS NULL OR bucket_time <= :to)
            ORDER BY bucket_time ASC
            """, nativeQuery = true)
    List<AnalyticsVotesTimeseries> findByPollIdAndOptionalRange(
            @Param("pollId") Long pollId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
