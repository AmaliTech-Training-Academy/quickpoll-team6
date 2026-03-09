package com.amalitech.quickpoll.mapper;

import com.amalitech.quickpoll.dto.*;
import com.amalitech.quickpoll.model.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PollMapper {

    public Poll toEntity(PollRequest request, User creator) {
        Poll poll = new Poll();
        poll.setQuestion(request.getQuestion());
        poll.setDescription(request.getDescription());
        poll.setCreator(creator);
        poll.setMultiSelect(request.isMultipleChoice());
        poll.setActive(true);
        return poll;
    }

    public PollResponse toResponse(Poll poll, List<OptionResponse> options, int totalVotes) {
        PollResponse response = new PollResponse();
        response.setId(poll.getId());
        response.setQuestion(poll.getQuestion());
        response.setDescription(poll.getDescription());
        response.setCreatorName(poll.getCreator().getFullName());
        response.setStatus(poll.isActive() ? "ACTIVE" : "CLOSED");
        response.setMultipleChoice(poll.isMultiSelect());
        response.setCreatedAt(poll.getCreatedAt());
        response.setTotalVotes(totalVotes);
        response.setOptions(options);
        return response;
    }

    public PollOption toOptionEntity(String optionText, Poll poll) {
        PollOption option = new PollOption();
        option.setOptionText(optionText);
        option.setPoll(poll);
        return option;
    }

    public OptionResponse toOptionResponse(PollOption option, int voteCount, double percentage) {
        OptionResponse response = new OptionResponse();
        response.setId(option.getId());
        response.setText(option.getOptionText());
        response.setVoteCount(voteCount);
        response.setPercentage(percentage);
        return response;
    }
}
