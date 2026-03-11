package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.DepartmentMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentMemberRepository extends JpaRepository<DepartmentMember, Long> {
    @Query("SELECT dm FROM DepartmentMember dm JOIN FETCH dm.department WHERE dm.email = :email")
    List<DepartmentMember> findAllByEmailWithDepartment(String email);
}
