package com.amalitech.quickpoll.mapper;

import com.amalitech.quickpoll.dto.PollRequest;
import com.amalitech.quickpoll.dto.PollResponse;
import com.amalitech.quickpoll.model.Poll;
import com.amalitech.quickpoll.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {PollOptionMapper.class})
public interface PollMapper {
    
    @Mapping(target = "question", source = "poll.question")
    @Mapping(target = "creatorName", source = "creator.fullName")
    @Mapping(target = "status", expression = "java(poll.isActive() ? \"ACTIVE\" : \"CLOSED\")")
    @Mapping(target = "maxSelections", source = "maxSelections")
    @Mapping(target = "options", ignore = true)
    @Mapping(target = "totalVotes", ignore = true)
    PollResponse toResponse(Poll poll);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "title", source = "request.title")
    @Mapping(target = "question", source = "request.question")
    @Mapping(target = "description", source = "request.description")
    @Mapping(target = "maxSelections", source = "request.maxSelections")
    @Mapping(target = "creator", source = "creator")
    @Mapping(target = "options", ignore = true)
    @Mapping(target = "invites", ignore = true)
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "expiresAt", source = "request.expiresAt")
    Poll toEntity(PollRequest request, User creator);
}
