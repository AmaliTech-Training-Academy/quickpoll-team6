package com.amalitech.quickpoll.mapper;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import org.springframework.stereotype.Component;

@Component
public class AuthMapper {

    public User toEntity(RegisterRequest request, String encodedPassword) {
        User user = new User();
        user.setFullName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(encodedPassword);
        user.setRole(Role.USER);
        return user;
    }

    public AuthResponse toResponse(User user, String token) {
        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setEmail(user.getEmail());
        response.setName(user.getFullName());
        response.setRole(user.getRole().name());
        return response;
    }
}
