package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.analytics.AnalyticsUserParticipation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserParticipationRepository extends JpaRepository<AnalyticsUserParticipation, Long> {

    /** Top users ordered by most votes cast, then most recently active. */
    Page<AnalyticsUserParticipation> findAllByOrderByTotalVotesCastDescLastActiveDesc(Pageable pageable);
}
