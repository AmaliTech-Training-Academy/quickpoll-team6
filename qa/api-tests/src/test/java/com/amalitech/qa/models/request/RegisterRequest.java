package com.amalitech.qa.models.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request model for user registration.
 * 
 * API Request Schema:
 * {
 *   "name": "string",
 *   "email": "string",
 *   "password": "string",
 *   "departmentId": 0
 * }
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
public class RegisterRequest {
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    private String password;
    
    @NotNull(message = "Department ID is required")
    private Integer departmentId;
    
    public RegisterRequest() {
    }
    
    /**
     * Legacy 3-arg constructor — defaults departmentId to 1.
     */
    public RegisterRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.departmentId = 1;
    }
    
    /**
     * Full constructor with all fields.
     */
    public RegisterRequest(String name, String email, String password, Integer departmentId) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.departmentId = departmentId;
    }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public Integer getDepartmentId() { return departmentId; }
    public void setDepartmentId(Integer departmentId) { this.departmentId = departmentId; }
}
