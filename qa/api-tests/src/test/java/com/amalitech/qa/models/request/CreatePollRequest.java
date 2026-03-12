package com.amalitech.qa.models.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Request model for creating a new poll.
 * Includes all required fields per API specification.
 * 
 * API Request Schema:
 * {
 *   "question": "string",
 *   "description": "string",
 *   "options": ["string"],
 *   "maxSelections": 0,
 *   "anonymous": true,
 *   "departmentIds": [0],
 *   "expiresAt": "2026-03-12T15:10:21.643Z"
 * }
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
public class CreatePollRequest {
    
    @NotNull(message = "Question is required")
    @Size(min = 5, max = 500, message = "Question must be between 5 and 500 characters")
    private String question;
    
    private String description;
    
    @NotNull(message = "Options are required")
    @Size(min = 2, max = 10, message = "Poll must have between 2 and 10 options")
    private List<String> options;
    
    @NotNull(message = "Max selections is required")
    private Integer maxSelections;
    
    @NotNull(message = "Anonymous flag is required")
    private Boolean anonymous;
    
    @NotNull(message = "Department IDs are required")
    private List<Integer> departmentIds;
    
    @NotNull(message = "Expiration date is required")
    private String expiresAt;
    
    public CreatePollRequest() {
    }
    
    /**
     * Legacy constructor for backward compatibility.
     * Sets default values for new required fields.
     */
    public CreatePollRequest(String question, String description, List<String> options, Boolean multipleChoice) {
        this.question = question;
        this.description = description;
        this.options = options;
        this.maxSelections = multipleChoice ? options.size() : 1;
        this.anonymous = false;
        this.departmentIds = List.of(1); // Default department
        this.expiresAt = LocalDateTime.now().plusDays(7).toString();
    }
    
    /**
     * Full constructor with all required fields.
     */
    public CreatePollRequest(String question, String description, List<String> options,
                           Integer maxSelections, Boolean anonymous, List<Integer> departmentIds, String expiresAt) {
        this.question = question;
        this.description = description;
        this.options = options;
        this.maxSelections = maxSelections;
        this.anonymous = anonymous;
        this.departmentIds = departmentIds;
        this.expiresAt = expiresAt;
    }
    
    // Getters and setters
    
    public String getQuestion() {
        return question;
    }
    
    public void setQuestion(String question) {
        this.question = question;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public List<String> getOptions() {
        return options;
    }
    
    public void setOptions(List<String> options) {
        this.options = options;
    }
    
    public Integer getMaxSelections() {
        return maxSelections;
    }
    
    public void setMaxSelections(Integer maxSelections) {
        this.maxSelections = maxSelections;
    }
    
    public Boolean getAnonymous() {
        return anonymous;
    }
    
    public void setAnonymous(Boolean anonymous) {
        this.anonymous = anonymous;
    }
    
    public List<Integer> getDepartmentIds() {
        return departmentIds;
    }
    
    public void setDepartmentIds(List<Integer> departmentIds) {
        this.departmentIds = departmentIds;
    }
    
    public String getExpiresAt() {
        return expiresAt;
    }
    
    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
    
    /**
     * Legacy method for backward compatibility.
     */
    public Boolean getMultipleChoice() {
        return maxSelections != null && maxSelections > 1;
    }
    
    /**
     * Legacy method for backward compatibility.
     */
    public void setMultipleChoice(Boolean multipleChoice) {
        if (multipleChoice != null && multipleChoice && options != null) {
            this.maxSelections = options.size();
        } else {
            this.maxSelections = 1;
        }
    }
}
