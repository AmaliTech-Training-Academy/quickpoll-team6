package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.config.JwtService;
import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.errorhandlers.*;
import com.amalitech.quickpoll.mapper.AuthMapper;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private AuthMapper authMapper;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_Success() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");
        request.setName("Test User");

        User user = new User();
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(Role.USER);

        AuthServiceResponse response = new AuthServiceResponse();
        response.setToken("token");
        response.setRefreshToken("refreshToken");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(authMapper.toUser(any(RegisterRequest.class))).thenReturn(user);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtService.generateToken(anyString(), anyString())).thenReturn("token");
        when(jwtService.generateRefreshToken(anyString(), anyString())).thenReturn("refreshToken");
        when(authMapper.toAuthServiceResponse(anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(response);

        AuthServiceResponse result = authService.register(request);

        assertNotNull(result);
        assertEquals("token", result.getToken());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_EmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");

        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(EmailAlreadyRegistered.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_Success() {
        AuthRequest request = new AuthRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        User user = new User();
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(Role.USER);

        Authentication authentication = mock(Authentication.class);
        AuthServiceResponse response = new AuthServiceResponse();
        response.setToken("token");

        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user);
        when(jwtService.generateToken(anyString(), anyString())).thenReturn("token");
        when(jwtService.generateRefreshToken(anyString(), anyString())).thenReturn("refreshToken");
        when(authMapper.toAuthServiceResponse(anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(response);

        AuthServiceResponse result = authService.login(request);

        assertNotNull(result);
        assertEquals("token", result.getToken());
    }

    @Test
    void login_InvalidCredentials() {
        AuthRequest request = new AuthRequest();
        request.setEmail("test@example.com");
        request.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void refreshToken_Success() {
        String refreshToken = "validRefreshToken";
        User user = new User();
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(Role.USER);

        AuthServiceResponse response = new AuthServiceResponse();
        response.setToken("newToken");

        when(jwtService.isTokenValid(anyString())).thenReturn(true);
        when(jwtService.extractEmail(anyString())).thenReturn("test@example.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(anyString(), anyString())).thenReturn("newToken");
        when(jwtService.generateRefreshToken(anyString(), anyString())).thenReturn("newRefreshToken");
        when(authMapper.toAuthServiceResponse(anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(response);

        AuthServiceResponse result = authService.refreshToken(refreshToken);

        assertNotNull(result);
        assertEquals("newToken", result.getToken());
    }

    @Test
    void refreshToken_InvalidToken() {
        String refreshToken = "invalidToken";

        when(jwtService.isTokenValid(anyString())).thenReturn(false);

        assertThrows(InvalidTokenException.class, () -> authService.refreshToken(refreshToken));
    }

    @Test
    void refreshToken_UserNotFound() {
        String refreshToken = "validToken";

        when(jwtService.isTokenValid(anyString())).thenReturn(true);
        when(jwtService.extractEmail(anyString())).thenReturn("nonexistent@example.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> authService.refreshToken(refreshToken));
    }
}
