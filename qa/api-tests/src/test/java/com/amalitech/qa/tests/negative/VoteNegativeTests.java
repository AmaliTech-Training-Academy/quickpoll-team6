package com.amalitech.qa.tests.negative;

import com.amalitech.qa.base.BaseTest;
import com.amalitech.qa.models.TestUser;
import com.amalitech.qa.models.request.VoteRequest;
import com.amalitech.qa.utils.TestHelper;
import io.qameta.allure.*;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Negative tests for Vote management endpoints.
 * Tests error handling, invalid inputs, and edge cases for:
 * - POST /votes/polls/{pollId} - Cast vote(s) on a poll
 * - GET /votes/my-votes - Fetch paginated list of votes
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
@Epic("QuickPoll API")
@Feature("Vote Management")
@Tag("negative")
@Tag("votes")
public class VoteNegativeTests extends BaseTest {
    
    @BeforeEach
    public void authenticateUser() {
        TestUser testUser = userRegistrationService.registerTestUser();
        authHandler.setAuthToken(testUser.getToken());
    }
    
    // ==================== POST /votes/polls/{pollId} - Negative ====================
    
    @Test
    @DisplayName("Cast vote on non-existent poll returns 404")
    @Description("Verify that voting on a non-existent poll returns 404 Not Found")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteOnNonExistentPoll() {
        // Arrange
        VoteRequest voteRequest = new VoteRequest(1);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/999999", voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 404);
    }
    
    @Test
    @DisplayName("Cast vote with invalid option ID returns error")
    @Description("Verify that voting with an invalid option ID returns an error")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteWithInvalidOptionId() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        VoteRequest voteRequest = new VoteRequest(999999);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        int statusCode = response.getStatusCode();
        assertTrue(
            statusCode == 400 || statusCode == 404,
            String.format("Expected 400 or 404 for invalid option ID, got %d. Response: %s",
                statusCode, response.getBody().asString())
        );
    }
    
    @Test
    @DisplayName("Cast vote with empty optionIds returns 400")
    @Description("Verify that voting with an empty optionIds array returns 400 Bad Request")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteWithEmptyOptionIds() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        VoteRequest voteRequest = new VoteRequest(Collections.emptyList());
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 400);
    }
    
    @Test
    @DisplayName("Cast vote without authentication returns 401")
    @Description("Verify that casting a vote without authentication returns 401 Unauthorized")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Cast Vote - Authentication")
    public void testCastVoteWithoutAuth() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        authHandler.clearToken();
        VoteRequest voteRequest = new VoteRequest(1);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 401);
    }
    
    @Test
    @DisplayName("Cast duplicate vote on same poll returns error")
    @Description("Verify that casting a duplicate vote on the same poll is handled appropriately")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastDuplicateVote() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        int firstOptionId = pollResponse.jsonPath().getInt("options[0].id");
        VoteRequest voteRequest = new VoteRequest(firstOptionId);
        
        // Cast first vote
        Response firstVote = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        TestHelper.assertStatusCode(firstVote, 200);
        
        // Act - Try to cast same vote again
        Response duplicateVote = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        int statusCode = duplicateVote.getStatusCode();
        assertTrue(
            statusCode == 400 || statusCode == 409,
            String.format("Expected 400 or 409 for duplicate vote, got %d. Response: %s",
                statusCode, duplicateVote.getBody().asString())
        );
    }
    
    @Test
    @DisplayName("Cast vote exceeding maxSelections returns 400")
    @Description("Verify that selecting more options than maxSelections allows returns 400 Bad Request")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteExceedingMaxSelections() {
        // Arrange - Create a poll with maxSelections = 1
        Map<String, Object> pollData = new HashMap<>();
        pollData.put("question", "Single selection only test poll question");
        pollData.put("description", "Testing max selections enforcement");
        pollData.put("options", Arrays.asList("Option A", "Option B", "Option C"));
        pollData.put("maxSelections", 1);
        pollData.put("anonymous", false);
        pollData.put("departmentIds", Arrays.asList(1));
        pollData.put("expiresAt", "2026-12-31T23:59:59Z");
        
        Response createResponse = apiClient.post("/api/polls", pollData);
        TestHelper.assertStatusCode(createResponse, 201);
        String pollId = createResponse.jsonPath().getString("id");
        testDataManager.trackResource("poll", pollId);
        
        // Get option IDs
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        int optionId1 = pollResponse.jsonPath().getInt("options[0].id");
        int optionId2 = pollResponse.jsonPath().getInt("options[1].id");
        
        // Try to select 2 options when maxSelections is 1
        VoteRequest voteRequest = new VoteRequest(Arrays.asList(optionId1, optionId2));
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 400);
    }
    
    @Test
    @DisplayName("Cast vote with null body returns 400")
    @Description("Verify that POST /votes/polls/{pollId} with empty body returns 400 Bad Request")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteWithNullBody() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        Map<String, Object> emptyBody = new HashMap<>();
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, emptyBody);
        
        // Assert
        TestHelper.assertStatusCode(response, 400);
    }
    
    @Test
    @DisplayName("Cast vote with null optionIds returns 400")
    @Description("Verify that POST /votes/polls/{pollId} with null optionIds returns 400 Bad Request")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteWithNullOptionIds() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        Map<String, Object> voteBody = new HashMap<>();
        voteBody.put("optionIds", null);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteBody);
        
        // Assert
        TestHelper.assertStatusCode(response, 400);
    }
    
    @Test
    @DisplayName("Cast vote with invalid pollId format returns error")
    @Description("Verify that POST /votes/polls/{pollId} with non-numeric pollId returns 400 or 404")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote - Error Handling")
    public void testCastVoteWithInvalidPollIdFormat() {
        // Arrange
        VoteRequest voteRequest = new VoteRequest(1);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/invalid-id", voteRequest);
        
        // Assert
        int statusCode = response.getStatusCode();
        assertTrue(
            statusCode == 400 || statusCode == 404,
            String.format("Expected 400 or 404 for invalid poll ID format, got %d", statusCode)
        );
    }
    
    // ==================== GET /votes/my-votes - Negative ====================
    
    @Test
    @DisplayName("Get my votes without authentication returns 401")
    @Description("Verify that GET /votes/my-votes without authentication returns 401 Unauthorized")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Get My Votes - Authentication")
    public void testGetMyVotesWithoutAuth() {
        // Arrange
        authHandler.clearToken();
        
        // Act
        Response response = apiClient.get("/api/votes/my-votes");
        
        // Assert
        TestHelper.assertStatusCode(response, 401);
    }
    
    @Test
    @DisplayName("Get my votes with page beyond total returns empty content")
    @Description("Verify that requesting a page beyond total pages returns empty content array")
    @Severity(SeverityLevel.NORMAL)
    @Story("Get My Votes - Edge Cases")
    public void testGetMyVotesPageBeyondTotal() {
        // Act
        Response response = apiClient.given()
            .queryParam("page", 9999)
            .queryParam("size", 10)
            .when()
            .get("/api/votes/my-votes")
            .then()
            .extract()
            .response();
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        
        List<?> content = response.jsonPath().getList("content");
        assertTrue(content.isEmpty(), "Content should be empty for page beyond total pages");
        
        boolean empty = response.jsonPath().getBoolean("empty");
        assertTrue(empty, "Page should be marked as empty");
    }
}

