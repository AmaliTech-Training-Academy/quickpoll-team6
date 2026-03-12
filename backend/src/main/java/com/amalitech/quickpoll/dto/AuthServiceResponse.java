package com.amalitech.quickpoll.dto;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AuthServiceResponse {
    private String token;
    private String refreshToken;
    private String email;
    private String name;
    private String role;
    private List<UserDepartmentResponse> departments;
}
