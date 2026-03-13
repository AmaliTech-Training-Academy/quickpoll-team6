package com.amalitech.quickpoll.config;

import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@commerceam.com")) {
            User admin = new User();
            admin.setEmail("admin@commerceam.com");
            admin.setPassword(passwordEncoder.encode("Bece@2018"));
            admin.setFullName("System Administrator");
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            log.info("Admin user created: admin@gmail.com");
        }
    }
}
