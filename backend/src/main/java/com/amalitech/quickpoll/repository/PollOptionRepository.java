package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface PollOptionRepository extends JpaRepository<PollOption, Long> {
    List<PollOption> findByPollId(Long pollId);

    @Modifying
    @Query("DELETE FROM PollOption o WHERE o.poll.id = :pollId")
    void deleteByPollId(@Param("pollId") Long pollId);
}
