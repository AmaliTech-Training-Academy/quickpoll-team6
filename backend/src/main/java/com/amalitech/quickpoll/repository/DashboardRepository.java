package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.analytics.AnalyticsPollSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface DashboardRepository extends JpaRepository<AnalyticsPollSummary, Long> {



    Page<AnalyticsPollSummary> findByStatusOrderByLastUpdatedDescCreatedAtDesc(String status, Pageable pageable);

    Page<AnalyticsPollSummary> findByStatusAndCreatorIdOrderByLastUpdatedDescCreatedAtDesc(
            String status, Long creatorId, Pageable pageable);



    Page<AnalyticsPollSummary> findAllByOrderByLastUpdatedDesc(Pageable pageable);

    Page<AnalyticsPollSummary> findByCreatorIdOrderByLastUpdatedDesc(Long creatorId, Pageable pageable);



    Optional<AnalyticsPollSummary> findByPollId(Long pollId);



    @Query(value = """
            SELECT
                COUNT(*) FILTER (WHERE status = 'ACTIVE')   AS active_poll_count,
                COUNT(*) FILTER (WHERE status = 'CLOSED')   AS closed_poll_count,
                COUNT(*)                                     AS total_poll_count,
        COALESCE(SUM(total_votes), 0)                AS total_votes_cast,
        COALESCE(ROUND(AVG(participation_rate)\\:\\:numeric, 2), 0) AS average_participation_rate,
        MAX(last_updated)                            AS last_refreshed_at
            FROM analytics_poll_summary
            """, nativeQuery = true)
    SummaryProjection getGlobalSummary();

    @Query(value = """
            SELECT
                COUNT(*) FILTER (WHERE status = 'ACTIVE')   AS active_poll_count,
                COUNT(*) FILTER (WHERE status = 'CLOSED')   AS closed_poll_count,
                COUNT(*)                                     AS total_poll_count,
        COALESCE(SUM(total_votes), 0)                AS total_votes_cast,
        COALESCE(ROUND(AVG(participation_rate)\\:\\:numeric, 2), 0) AS average_participation_rate,
        MAX(last_updated)                            AS last_refreshed_at
            FROM analytics_poll_summary
            WHERE creator_id = :creatorId
            """, nativeQuery = true)
    SummaryProjection getCreatorSummary(@Param("creatorId") Long creatorId);





    interface SummaryProjection {
        Long getActive_poll_count();
        Long getClosed_poll_count();
        Long getTotal_poll_count();
        Long getTotal_votes_cast();
        Double getAverage_participation_rate();
        LocalDateTime getLast_refreshed_at();
    }
}
