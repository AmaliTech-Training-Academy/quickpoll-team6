package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {

    @Query("SELECT v FROM Vote v JOIN FETCH v.poll JOIN FETCH v.option WHERE v.user.id = :userId ORDER BY v.createdAt DESC")
    Page<Vote> findByUserIdWithDetails(@Param("userId") Long userId, Pageable pageable);
    List<Vote> findByPollId(Long pollId);
    Optional<Vote> findByUserIdAndPollId(Long userId, Long pollId);

    @Modifying
    @Query("DELETE FROM Vote v WHERE v.poll.id = :pollId")
    void deleteByPollId(@Param("pollId") Long pollId);
    boolean existsByUserIdAndPollId(Long userId, Long pollId);
    int countByOptionId(Long optionId);
    
    @Query("SELECT v.option.id, COUNT(v) FROM Vote v WHERE v.option.id IN :optionIds GROUP BY v.option.id")
    List<Object[]> countVotesByOptionIds(@Param("optionIds") List<Long> optionIds);
}
