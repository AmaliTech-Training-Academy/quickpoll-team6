package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.config.JwtService;
import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.mapper.AuthMapper;
import com.amalitech.quickpoll.service.AuthService;
import com.amalitech.quickpoll.service.TokenBlacklistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and registration endpoints")
public class AuthController {
    private static final int REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

    private final AuthService authService;
    private final AuthMapper authMapper;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/auth/refresh")
                .maxAge(REFRESH_TOKEN_MAX_AGE_SECONDS)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Create a new user account")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        AuthServiceResponse serviceResponse = authService.register(request);
        setRefreshTokenCookie(response, serviceResponse.getRefreshToken());
        return ResponseEntity.status(HttpStatus.CREATED).body(authMapper.toAuthResponse(serviceResponse));
    }

    @PostMapping("/login")
    @Operation(summary = "Login user", description = "Authenticate user and return JWT token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request, HttpServletResponse response) {
        AuthServiceResponse serviceResponse = authService.login(request);
        setRefreshTokenCookie(response, serviceResponse.getRefreshToken());
        return ResponseEntity.ok(authMapper.toAuthResponse(serviceResponse));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh token", description = "Generate new access token using refresh token")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(value = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        if (refreshToken == null) {
            return ResponseEntity.badRequest().build();
        }
        AuthServiceResponse serviceResponse = authService.refreshToken(refreshToken);
        setRefreshTokenCookie(response, serviceResponse.getRefreshToken());
        return ResponseEntity.ok(authMapper.toAuthResponse(serviceResponse));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Invalidate the current access token")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authHeader.substring(7);
        if (!jwtService.isTokenValid(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        tokenBlacklistService.blacklist(token, jwtService.getExpirationDate(token));

        ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/auth/refresh")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", clearCookie.toString());

        return ResponseEntity.noContent().build();
    }
}
