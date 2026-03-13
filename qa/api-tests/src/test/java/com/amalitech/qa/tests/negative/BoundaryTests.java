package com.amalitech.qa.tests.negative;

import com.amalitech.qa.base.BaseTest;
import com.amalitech.qa.models.TestUser;
import com.amalitech.qa.models.request.CreatePollRequest;
import com.amalitech.qa.models.request.RegisterRequest;
import com.amalitech.qa.utils.TestHelper;
import io.qameta.allure.*;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Negative tests for boundary conditions and edge cases.
 * Tests API behavior with extreme values and boundary inputs.
 * 
 * Field Constraints (from poll-response-schema.json):
 * - question: minLength=5, maxLength=500 (REQUIRED)
 * - options: minItems=2, maxItems=10 (REQUIRED)
 * - description: no explicit constraints (OPTIONAL)
 * 
 * Expected Behaviors:
 * - Required fields with null values: 400 Bad Request
 * - Optional fields with null values: 200/201 OK
 * - Fields exceeding max length: 400 Bad Request with validation error
 * - Special characters and unicode: Should be accepted (UTF-8 support) with 201
 * - Options exceeding max count of 10: 400 Bad Request
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
@Epic("QuickPoll API")
@Feature("Error Handling")
@Tag("negative")
@Tag("boundary")
public class BoundaryTests extends BaseTest {
    
    @BeforeEach
    public void authenticateUser() {
        // Register and authenticate test user before tests that require authentication
        TestUser testUser = userRegistrationService.registerTestUser();
        authHandler.setAuthToken(testUser.getToken());
    }
    
    @Test
    @DisplayName("Create poll with extremely long question - should reject with 400")
    @Description("Verify API rejects poll questions exceeding maximum length (500 characters)")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithVeryLongQuestion() {
        // Field constraint: question max length = 500 characters (per poll-response-schema.json)
        // Expected behavior: API should reject with 400 Bad Request and validation error message
        
        // Arrange - Create a 10000 character question (far exceeds 500 char limit)
        String longQuestion = "A".repeat(10000);
        CreatePollRequest pollRequest = new CreatePollRequest(
            longQuestion,
            "Test Description",
            Arrays.asList("Option 1", "Option 2"),
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should reject with 400 and mention question length
        TestHelper.assertStatusCode(response, 400);
        
        String errorMessage = response.jsonPath().getString("message");
        assertNotNull(errorMessage,
            "Error response should contain a message");

        String lowerMessage = errorMessage.toLowerCase();
        assertTrue(
            lowerMessage.contains("question") || lowerMessage.contains("length") || lowerMessage.contains("long"),
            String.format("Error message should mention question length constraint. Got: %s", errorMessage)
        );
    }
    
    @Test
    @DisplayName("Create poll with too many options (>10) - should reject with 400")
    @Description("Verify API rejects polls exceeding maximum option count of 10")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithManyOptions() {
        // Field constraint: options max items = 10 (backend enforces max of 10)
        // Expected behavior: API should reject with 400 Bad Request
        
        // Arrange - Create 11 options (just above the max of 10)
        List<String> tooManyOptions = IntStream.range(1, 12)
            .mapToObj(i -> "Option " + i)
            .collect(Collectors.toList());
        
        CreatePollRequest pollRequest = new CreatePollRequest(
            "Poll with too many options",
            "Testing boundary - max 10 options allowed",
            tooManyOptions,
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should reject with 400 because more than 10 options
        TestHelper.assertStatusCode(response, 400);
        
        String errorMessage = response.jsonPath().getString("message");
        assertNotNull(errorMessage,
            "Error response should contain a message");
    }
    
    @Test
    @DisplayName("Create poll with exactly 10 options - should succeed")
    @Description("Verify API accepts polls with exactly 10 options (the maximum allowed)")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithExactlyMaxOptions() {
        // Field constraint: options max items = 10
        // Expected behavior: API should accept exactly 10 options
        
        // Arrange - Create exactly 10 options (at the boundary)
        List<String> maxOptions = IntStream.range(1, 11)
            .mapToObj(i -> "Option " + i)
            .collect(Collectors.toList());
        
        CreatePollRequest pollRequest = new CreatePollRequest(
            "Poll with maximum options",
            "Testing boundary - exactly 10 options",
            maxOptions,
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should accept with 201
        TestHelper.assertStatusCode(response, 201);
        TestHelper.assertResponseNotNull(response, "id");
        
        // Cleanup
        String pollId = response.jsonPath().getString("id");
        if (pollId != null) {
            testDataManager.getCreatedResourceIds().add(pollId);
        }
    }
    
    @Test
    @DisplayName("Register with very long name")
    @Description("Verify API handles extremely long user names")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testRegisterWithVeryLongName() {
        // Arrange
        String longName = "A".repeat(1000);
        String uniqueEmail = "testuser" + System.currentTimeMillis() + "@example.com";
        RegisterRequest registerRequest = new RegisterRequest(
            longName,
            uniqueEmail,
            "SecurePass@123"
        );
        
        // Act
        Response response = apiClient.post("/api/auth/register", registerRequest);
        
        // Assert - API may accept or reject
        int statusCode = response.getStatusCode();
        assertTrue(
            statusCode == 400 || statusCode == 200 || statusCode == 201,
            "Expected 400 (rejected), 200, or 201 (accepted)"
        );
    }
    
    @Test
    @DisplayName("Register with very long email")
    @Description("Verify API handles extremely long email addresses")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testRegisterWithVeryLongEmail() {
        // Arrange - Create a very long but valid email
        String longEmail = "a".repeat(200) + "@example.com";
        RegisterRequest registerRequest = new RegisterRequest(
            "Test User",
            longEmail,
            "SecurePass@123"
        );
        
        // Act
        Response response = apiClient.post("/api/auth/register", registerRequest);
        
        // Assert - API may accept or reject
        int statusCode = response.getStatusCode();
        assertTrue(
            statusCode == 400 || statusCode == 200 || statusCode == 201,
            "Expected 400 (rejected), 200, or 201 (accepted)"
        );
    }
    
    @Test
    @DisplayName("Create poll with special characters - should accept with 201")
    @Description("Verify API accepts special characters and emojis in poll questions and options")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithSpecialCharacters() {
        // Expected behavior: Special characters and emojis should be accepted with 201
        // These are valid UTF-8 characters and should not be rejected
        
        // Arrange
        CreatePollRequest pollRequest = new CreatePollRequest(
            "Test!@#$%^&*()_+-=[]{}|;':\",./<>?",
            "Description with émojis 🎉🎊",
            Arrays.asList("Option 1 ✓", "Option 2 ✗"),
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should accept special characters with 201 Created
        TestHelper.assertStatusCode(response, 201);
        
        // Verify special characters are preserved in response
        String question = response.jsonPath().getString("question");
        assertTrue(
            question.contains("!@#$"),
            "Special characters should be preserved in response"
        );
        
        // Cleanup
        String pollId = response.jsonPath().getString("id");
        if (pollId != null) {
            testDataManager.getCreatedResourceIds().add(pollId);
        }
    }
    
    @Test
    @DisplayName("Create poll with unicode characters - should accept with 201")
    @Description("Verify API accepts unicode characters from various languages with 201 Created")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithUnicodeCharacters() {
        // Expected behavior: Unicode characters should be accepted with 201 (UTF-8 support)
        // Modern APIs should support international characters
        
        // Arrange
        CreatePollRequest pollRequest = new CreatePollRequest(
            "你好世界 مرحبا العالم Привет мир",
            "Testing unicode support",
            Arrays.asList("选项 1", "خيار 2", "Вариант 3"),
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should accept unicode with 201 Created
        TestHelper.assertStatusCode(response, 201);
        
        // Verify unicode is preserved in response
        String question = response.jsonPath().getString("question");
        assertTrue(
            question.contains("你好") || question.contains("مرحبا") || question.contains("Привет"),
            "Unicode characters should be preserved in response"
        );
        
        // Cleanup
        String pollId = response.jsonPath().getString("id");
        if (pollId != null) {
            testDataManager.getCreatedResourceIds().add(pollId);
        }
    }
    
    @Test
    @DisplayName("Create poll with null description - should accept with 201 (optional field)")
    @Description("Verify API accepts null description since it's an optional field and returns 201 Created")
    @Severity(SeverityLevel.NORMAL)
    @Story("Boundary Conditions")
    public void testCreatePollWithNullDescription() {
        // Field constraint: description is optional (not in required fields)
        // Expected behavior: API should accept null for optional fields with 201 Created
        
        // Arrange
        CreatePollRequest pollRequest = new CreatePollRequest(
            "Test Question with null description",
            null, // Optional field - should be accepted
            Arrays.asList("Option 1", "Option 2"),
            false
        );
        
        // Act
        Response response = apiClient.post("/api/polls", pollRequest);
        
        // Assert - Should accept null for optional field with 201 Created
        TestHelper.assertStatusCode(response, 201);
        
        // Cleanup
        String pollId = response.jsonPath().getString("id");
        if (pollId != null) {
            testDataManager.getCreatedResourceIds().add(pollId);
        }
    }
}
