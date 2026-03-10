package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.Poll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PollRepository extends JpaRepository<Poll, Long> {
    Page<Poll> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Poll> findByCreatorIdOrderByCreatedAtDesc(Long creatorId);
    
    @Query("SELECT p FROM Poll p WHERE p.active = true AND p.expiresAt IS NOT NULL AND p.expiresAt <= :now")
    List<Poll> findExpiredActivePolls(@Param("now") LocalDateTime now);
}
