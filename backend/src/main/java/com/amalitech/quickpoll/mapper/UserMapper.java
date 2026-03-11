package com.amalitech.quickpoll.mapper;

import com.amalitech.quickpoll.dto.UserDepartmentResponse;
import com.amalitech.quickpoll.dto.UserProfileResponse;
import com.amalitech.quickpoll.dto.UserUpdateRequest;
import com.amalitech.quickpoll.model.Department;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = org.mapstruct.NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {
    @Mapping(target = "name", source = "fullName")
    @Mapping(target = "role", expression = "java(mapRoleToString(user.getRole()))")
    @Mapping(target = "departments", ignore = true)
    UserProfileResponse toProfileResponse(User user);

    default UserDepartmentResponse mapDepartment(Department department) {
        if (department == null) return null;
        return UserDepartmentResponse.builder()
            .id(department.getId())
            .name(department.getName())
            .build();
    }

    default String mapRoleToString(Role role) {
        return role != null ? role.name() : null;
    }

    @Mapping(target = "fullName", source = "name")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "authorities", ignore = true)
    void updateUserFromRequest(UserUpdateRequest request, @MappingTarget User user);
}
