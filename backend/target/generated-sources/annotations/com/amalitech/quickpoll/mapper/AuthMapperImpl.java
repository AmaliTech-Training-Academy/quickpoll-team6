package com.amalitech.quickpoll.mapper;

import com.amalitech.quickpoll.dto.AuthResponse;
import com.amalitech.quickpoll.dto.AuthServiceResponse;
import com.amalitech.quickpoll.dto.RegisterRequest;
import com.amalitech.quickpoll.model.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-09T14:16:31+0000",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Ubuntu)"
)
@Component
public class AuthMapperImpl implements AuthMapper {

    @Override
    public User toUser(RegisterRequest request) {
        if ( request == null ) {
            return null;
        }

        User user = new User();

        user.setFullName( request.getName() );
        user.setEmail( request.getEmail() );

        return user;
    }

    @Override
    public AuthServiceResponse toAuthServiceResponse(String token, String refreshToken, String email, String name, String role) {
        if ( token == null && refreshToken == null && email == null && name == null && role == null ) {
            return null;
        }

        AuthServiceResponse authServiceResponse = new AuthServiceResponse();

        authServiceResponse.setToken( token );
        authServiceResponse.setRefreshToken( refreshToken );
        authServiceResponse.setEmail( email );
        authServiceResponse.setName( name );
        authServiceResponse.setRole( role );

        return authServiceResponse;
    }

    @Override
    public AuthResponse toAuthResponse(AuthServiceResponse serviceResponse) {
        if ( serviceResponse == null ) {
            return null;
        }

        AuthResponse authResponse = new AuthResponse();

        authResponse.setToken( serviceResponse.getToken() );
        authResponse.setEmail( serviceResponse.getEmail() );
        authResponse.setName( serviceResponse.getName() );
        authResponse.setRole( serviceResponse.getRole() );

        return authResponse;
    }
}
