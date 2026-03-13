package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.PollInvite;
import com.amalitech.quickpoll.model.enums.VoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollInviteRepository extends JpaRepository<PollInvite, Long> {
    @Query("SELECT pi FROM PollInvite pi WHERE pi.poll.id = :pollId AND pi.departmentMember.email = :email")
    Optional<PollInvite> findByPollIdAndMemberEmail(@Param("pollId") Long pollId, @Param("email") String email);
    
    boolean existsByPollIdAndDepartmentMemberEmailAndVoteStatus(Long pollId, String email, VoteStatus voteStatus);

    @Query("SELECT pi.poll.id FROM PollInvite pi WHERE pi.departmentMember.email = :email AND pi.poll.id IN :pollIds AND pi.voteStatus = com.amalitech.quickpoll.model.enums.VoteStatus.VOTED")
    List<Long> findVotedPollIdsByEmailAndPollIds(@Param("email") String email, @Param("pollIds") List<Long> pollIds);

    @Modifying
    @Query("DELETE FROM PollInvite i WHERE i.poll.id = :pollId")
    void deleteByPollId(@Param("pollId") Long pollId);
}
