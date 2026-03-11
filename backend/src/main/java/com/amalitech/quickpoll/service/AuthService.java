package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.config.JwtService;
import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.errorhandlers.EmailAlreadyRegistered;
import com.amalitech.quickpoll.errorhandlers.InvalidTokenException;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.errorhandlers.UserNotFoundException;
import com.amalitech.quickpoll.mapper.AuthMapper;
import com.amalitech.quickpoll.model.Department;
import com.amalitech.quickpoll.model.DepartmentMember;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.DepartmentMemberRepository;
import com.amalitech.quickpoll.repository.DepartmentRepository;
import com.amalitech.quickpoll.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;
import java.util.List;
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final AuthMapper authMapper;
    private final DepartmentRepository departmentRepository;
    private final DepartmentMemberRepository departmentMemberRepository;

   @Transactional
   public AuthServiceResponse register(RegisterRequest request) {
    if (userRepository.existsByEmail(request.getEmail())) {
        throw new EmailAlreadyRegistered("Email already registered");
    }
    User user = authMapper.toUser(request);
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setRole(Role.USER);
    User savedUser = userRepository.save(user);
    
    List<UserDepartmentResponse> departmentResponses = Collections.emptyList();
    Long departmentId = request.getDepartmentId();
    if (departmentId != null) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        
        DepartmentMember member = DepartmentMember.builder()
                .email(savedUser.getEmail())
                .department(department)
                .build();
        if (member != null) {
            departmentMemberRepository.save(member);
        }
        
        departmentResponses = getDepartmentResponses(savedUser.getEmail());
    }
    log.info("Fetched department responses: {}", departmentResponses);

    String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().name());
    String refreshToken = jwtService.generateRefreshToken(savedUser.getEmail(), savedUser.getRole().name());

    return authMapper.toAuthServiceResponse(token, refreshToken, savedUser.getEmail(), savedUser.getFullName(), savedUser.getRole().name(), departmentResponses);
}

    public AuthServiceResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        User user = (User) authentication.getPrincipal();
        
        List<UserDepartmentResponse> departmentResponses = getDepartmentResponses(user.getEmail());

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getRole().name());
        return authMapper.toAuthServiceResponse(token, refreshToken, user.getEmail(), user.getFullName(), user.getRole().name(), departmentResponses);
    }

    public AuthServiceResponse refreshToken(String refreshToken) {
        if (!jwtService.isTokenValid(refreshToken)) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        String email = jwtService.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        List<UserDepartmentResponse> departmentResponses = getDepartmentResponses(user.getEmail());

        String newToken = jwtService.generateToken(user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getRole().name());

        return authMapper.toAuthServiceResponse(newToken, newRefreshToken, user.getEmail(), user.getFullName(), user.getRole().name(), departmentResponses);
    }
    
    private List<UserDepartmentResponse> getDepartmentResponses(String email) {
        return departmentMemberRepository.findAllByEmailWithDepartment(email)
                .stream()
                .map(dm -> UserDepartmentResponse.builder()
                        .id(dm.getDepartment().getId())
                        .name(dm.getDepartment().getName())
                        .build())
                .toList();
    }
}
