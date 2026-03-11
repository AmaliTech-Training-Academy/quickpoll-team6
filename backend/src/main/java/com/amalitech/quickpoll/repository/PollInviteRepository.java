package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.PollInvite;
import com.amalitech.quickpoll.model.enums.VoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PollInviteRepository extends JpaRepository<PollInvite, Long> {
    @Query("SELECT pi FROM PollInvite pi WHERE pi.poll.id = :pollId AND pi.departmentMember.email = :email")
    Optional<PollInvite> findByPollIdAndMemberEmail(@Param("pollId") Long pollId, @Param("email") String email);
    
    boolean existsByPollIdAndDepartmentMemberEmailAndVoteStatus(Long pollId, String email, VoteStatus voteStatus);
}
