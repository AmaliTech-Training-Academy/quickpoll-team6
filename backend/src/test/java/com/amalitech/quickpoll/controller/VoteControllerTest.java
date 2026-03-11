package com.amalitech.quickpoll.controller;

import com.amalitech.quickpoll.dto.VoteRequest;
import com.amalitech.quickpoll.dto.VoteResponse;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.service.VoteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VoteController.class)
class VoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VoteService voteService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser
    void castVote_Success() throws Exception {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L, 2L));

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");
        voter.setRole(Role.USER);

        VoteResponse response = new VoteResponse(true, "Vote cast successfully");

        when(voteService.castVote(eq(pollId), any(VoteRequest.class), any(User.class)))
            .thenReturn(response);

        mockMvc.perform(post("/votes/polls/{pollId}", pollId)
                .with(user(voter))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Vote cast successfully"));
    }

    @Test
    @WithMockUser
    void castVote_InvalidRequest() throws Exception {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        // Missing optionIds - should trigger validation error

        User voter = new User();
        voter.setId(1L);
        voter.setEmail("voter@example.com");
        voter.setRole(Role.USER);

        mockMvc.perform(post("/votes/polls/{pollId}", pollId)
                .with(user(voter))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void castVote_Unauthorized() throws Exception {
        Long pollId = 1L;
        VoteRequest request = new VoteRequest();
        request.setOptionIds(List.of(1L));

        mockMvc.perform(post("/votes/polls/{pollId}", pollId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}