package com.amalitech.qa.tests.functional;

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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Functional tests for Vote management endpoints.
 * Tests happy-path scenarios for casting votes and retrieving user votes.
 * 
 * Endpoints under test:
 * - POST /votes/polls/{pollId} - Cast vote(s) on a poll
 * - GET /votes/my-votes - Fetch paginated list of all votes cast by the authenticated user
 * 
 * @see com.amalitech.qa.tests.negative.VoteNegativeTests for negative / error-handling tests
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
@Epic("QuickPoll API")
@Feature("Vote Management")
@Tag("functional")
@Tag("votes")
public class VoteTests extends BaseTest {
    
    @BeforeEach
    public void authenticateUser() {
        TestUser testUser = userRegistrationService.registerTestUser();
        authHandler.setAuthToken(testUser.getToken());
    }
    
    // ==================== POST /votes/polls/{pollId} ====================
    
    @Test
    @DisplayName("Cast a single vote on a poll")
    @Description("Verify that an authenticated user can cast a single vote on a poll via POST /votes/polls/{pollId}")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Cast Vote")
    public void testCastSingleVote() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        TestHelper.assertStatusCode(pollResponse, 200);
        int firstOptionId = pollResponse.jsonPath().getInt("options[0].id");
        VoteRequest voteRequest = new VoteRequest(firstOptionId);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        TestHelper.assertResponseNotNull(response, "success");
        TestHelper.assertResponseNotNull(response, "message");
        assertTrue(response.jsonPath().getBoolean("success"), "Vote should be cast successfully");
    }
    
    @Test
    @DisplayName("Cast multiple votes on a poll (multi-select)")
    @Description("Verify that an authenticated user can cast multiple votes on a poll that allows multiple selections")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Cast Vote")
    public void testCastMultipleVotes() {
        // Arrange - Create a poll with multiple selections allowed
        Map<String, Object> pollData = new HashMap<>();
        pollData.put("question", "Multi-select vote test poll question");
        pollData.put("description", "Testing multiple vote selections");
        pollData.put("options", Arrays.asList("Option A", "Option B", "Option C"));
        pollData.put("maxSelections", 2);
        pollData.put("anonymous", false);
        pollData.put("departmentIds", Arrays.asList(1));
        pollData.put("expiresAt", "2026-12-31T23:59:59Z");
        
        Response createResponse = apiClient.post("/api/polls", pollData);
        TestHelper.assertStatusCode(createResponse, 201);
        String pollId = createResponse.jsonPath().getString("id");
        testDataManager.trackResource("poll", pollId);
        
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        int optionId1 = pollResponse.jsonPath().getInt("options[0].id");
        int optionId2 = pollResponse.jsonPath().getInt("options[1].id");
        VoteRequest voteRequest = new VoteRequest(Arrays.asList(optionId1, optionId2));
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        TestHelper.assertResponseNotNull(response, "success");
        TestHelper.assertResponseNotNull(response, "message");
    }
    
    @Test
    @DisplayName("Vote response contains success and message fields")
    @Description("Verify that the vote response contains the required success and message fields per Swagger spec")
    @Severity(SeverityLevel.NORMAL)
    @Story("Cast Vote")
    public void testVoteResponseFields() {
        // Arrange
        String pollId = testDataManager.createTestPollWithDefaults();
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        int firstOptionId = pollResponse.jsonPath().getInt("options[0].id");
        VoteRequest voteRequest = new VoteRequest(firstOptionId);
        
        // Act
        Response response = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        
        Boolean success = response.jsonPath().getBoolean("success");
        assertNotNull(success, "Response should contain 'success' field");
        assertTrue(success, "Vote should be successful");
        
        String message = response.jsonPath().getString("message");
        assertNotNull(message, "Response should contain 'message' field");
        assertFalse(message.isEmpty(), "Message should not be empty");
    }
    
    // ==================== GET /votes/my-votes ====================
    
    @Test
    @DisplayName("Get my votes returns paginated response")
    @Description("Verify that GET /votes/my-votes returns a paginated list of votes cast by the authenticated user")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Get My Votes")
    public void testGetMyVotes() {
        // Act
        Response response = apiClient.get("/api/votes/my-votes");
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        TestHelper.assertResponseNotNull(response, "content");
        TestHelper.assertResponseNotNull(response, "totalElements");
        TestHelper.assertResponseNotNull(response, "totalPages");
        TestHelper.assertResponseNotNull(response, "size");
        TestHelper.assertResponseNotNull(response, "number");
        assertInstanceOf(List.class, response.jsonPath().get("content"), "Content should be an array");
    }
    
    @Test
    @DisplayName("Get my votes with default pagination (page=0, size=10)")
    @Description("Verify that GET /votes/my-votes uses default pagination parameters")
    @Severity(SeverityLevel.NORMAL)
    @Story("Get My Votes")
    public void testGetMyVotesDefaultPagination() {
        // Act
        Response response = apiClient.get("/api/votes/my-votes");
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        assertEquals(0, response.jsonPath().getInt("number"), "Default page number should be 0");
        assertEquals(10, response.jsonPath().getInt("size"), "Default page size should be 10");
    }
    
    @Test
    @DisplayName("Get my votes with custom pagination parameters")
    @Description("Verify that GET /votes/my-votes respects custom page and size query parameters")
    @Severity(SeverityLevel.NORMAL)
    @Story("Get My Votes")
    public void testGetMyVotesCustomPagination() {
        // Act
        Response response = apiClient.given()
            .queryParam("page", 0)
            .queryParam("size", 5)
            .when()
            .get("/api/votes/my-votes")
            .then()
            .extract()
            .response();
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        assertEquals(5, response.jsonPath().getInt("size"), "Page size should be 5 as requested");
    }
    
    @Test
    @DisplayName("Get my votes returns votes after casting")
    @Description("Verify that GET /votes/my-votes includes a vote after it has been cast")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Get My Votes")
    public void testGetMyVotesAfterCasting() {
        // Arrange - Create a poll and cast a vote
        String pollId = testDataManager.createTestPollWithDefaults();
        Response pollResponse = apiClient.get("/api/polls/" + pollId);
        int firstOptionId = pollResponse.jsonPath().getInt("options[0].id");
        
        VoteRequest voteRequest = new VoteRequest(firstOptionId);
        Response voteResponse = apiClient.post("/api/votes/polls/" + pollId, voteRequest);
        TestHelper.assertStatusCode(voteResponse, 200);
        
        // Act
        Response response = apiClient.get("/api/votes/my-votes");
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        assertTrue(response.jsonPath().getInt("totalElements") > 0,
            "Should have at least one vote after casting");
        
        List<?> content = response.jsonPath().getList("content");
        assertFalse(content.isEmpty(), "Content array should not be empty after casting a vote");
        
        // Verify vote item structure matches Swagger spec
        TestHelper.assertResponseNotNull(response, "content[0].voteId");
        TestHelper.assertResponseNotNull(response, "content[0].pollId");
        TestHelper.assertResponseNotNull(response, "content[0].pollQuestion");
        TestHelper.assertResponseNotNull(response, "content[0].optionId");
        TestHelper.assertResponseNotNull(response, "content[0].optionText");
        TestHelper.assertResponseNotNull(response, "content[0].votedAt");
    }
    
    @Test
    @DisplayName("Get my votes pagination metadata is valid")
    @Description("Verify that GET /votes/my-votes returns valid pagination metadata fields")
    @Severity(SeverityLevel.NORMAL)
    @Story("Get My Votes")
    public void testGetMyVotesPaginationMetadata() {
        // Act
        Response response = apiClient.get("/api/votes/my-votes");
        
        // Assert
        TestHelper.assertStatusCode(response, 200);
        
        int totalElements = response.jsonPath().getInt("totalElements");
        int totalPages = response.jsonPath().getInt("totalPages");
        int size = response.jsonPath().getInt("size");
        int number = response.jsonPath().getInt("number");
        boolean first = response.jsonPath().getBoolean("first");
        boolean last = response.jsonPath().getBoolean("last");
        boolean empty = response.jsonPath().getBoolean("empty");
        int numberOfElements = response.jsonPath().getInt("numberOfElements");
        
        assertTrue(totalElements >= 0, "totalElements should be non-negative");
        assertTrue(totalPages >= 0, "totalPages should be non-negative");
        assertTrue(size >= 0, "size should be non-negative");
        assertTrue(number >= 0, "number should be non-negative");
        assertTrue(numberOfElements >= 0, "numberOfElements should be non-negative");
        
        if (number == 0) {
            assertTrue(first, "Should be the first page when page number is 0");
        }
        if (empty) {
            assertEquals(0, totalElements, "totalElements should be 0 when page is empty");
        }
    }
}
