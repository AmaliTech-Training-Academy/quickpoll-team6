package com.amalitech.qa.models.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Request model for casting a vote on a poll.
 * Used with POST /votes/polls/{pollId}
 * 
 * API Request Schema:
 * {
 *   "optionIds": [0]
 * }
 * 
 * @author QuickPoll API Testing Framework
 * @version 2.0.0
 */
public class VoteRequest {
    
    @NotNull(message = "Option IDs are required")
    private List<Integer> optionIds;
    
    public VoteRequest() {
    }
    
    public VoteRequest(List<Integer> optionIds) {
        this.optionIds = optionIds;
    }
    
    /**
     * Convenience constructor for single option vote.
     */
    public VoteRequest(Integer optionId) {
        this.optionIds = List.of(optionId);
    }
    
    public List<Integer> getOptionIds() {
        return optionIds;
    }
    
    public void setOptionIds(List<Integer> optionIds) {
        this.optionIds = optionIds;
    }
}
