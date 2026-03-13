package com.amalitech.quickpoll.config;

import com.amalitech.quickpoll.repository.UserRepository;
import com.amalitech.quickpoll.service.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthenticationEntryPoint authenticationEntryPoint;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        if (path.startsWith("/auth/") || path.startsWith("/swagger-ui/") || path.startsWith("/api-docs/") || path.startsWith("/v3/api-docs/") || path.startsWith("/actuator/") || path.startsWith("/departments")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authHeader.substring(7);
            if (!jwtService.isTokenValid(token) || tokenBlacklistService.isBlacklisted(token)) {
                authenticationEntryPoint.commence(request, response, 
                    new org.springframework.security.authentication.BadCredentialsException("Invalid or expired token"));
                return;
            }

            String email = jwtService.extractEmail(token);
            userRepository.findByEmail(email).ifPresentOrElse(
                user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            user, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                },
                () -> {
                    try {
                        authenticationEntryPoint.commence(request, response,
                            new org.springframework.security.authentication.BadCredentialsException("User not found"));
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }
            );
            filterChain.doFilter(request, response);
        } catch (AuthenticationException e) {
            authenticationEntryPoint.commence(request, response, e);
        }
    }
}
