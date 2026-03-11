package com.amalitech.quickpoll.repository;

import com.amalitech.quickpoll.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    
    @Query("SELECT u.email FROM User u WHERE u.email IN :emails")
    List<String> findEmailsByEmailIn(List<String> emails);
    
    @Query("SELECT u.email FROM User u ORDER BY u.email")
    List<String> findAllEmails();
}
