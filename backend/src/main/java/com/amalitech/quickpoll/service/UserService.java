package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.DepartmentResponse;
import com.amalitech.quickpoll.dto.UserDepartmentResponse;
import com.amalitech.quickpoll.dto.UserProfileResponse;
import com.amalitech.quickpoll.dto.UserUpdateRequest;
import com.amalitech.quickpoll.errorhandlers.UserNotFoundException;
import com.amalitech.quickpoll.mapper.UserMapper;
import com.amalitech.quickpoll.model.DepartmentMember;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.repository.DepartmentMemberRepository;
import com.amalitech.quickpoll.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final DepartmentMemberRepository departmentMemberRepository;

    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        UserProfileResponse response = userMapper.toProfileResponse(user);
        enrichWithDepartment(response, user.getEmail());
        return response;
    }

    public UserProfileResponse getCurrentUserProfile(User user) {
        UserProfileResponse response = userMapper.toProfileResponse(user);
        enrichWithDepartment(response, user.getEmail());
        return response;
    }
    
    public List<String> getAllEmails() {
        return userRepository.findAllEmails();
    }

    @Transactional
    public UserProfileResponse updateUser(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        userMapper.updateUserFromRequest(request, user);

        User updatedUser = userRepository.save(user);
        UserProfileResponse response = userMapper.toProfileResponse(updatedUser);
        enrichWithDepartment(response, updatedUser.getEmail());
        return response;
    }

    private void enrichWithDepartment(UserProfileResponse response, String email) {
        List<UserDepartmentResponse> departments = departmentMemberRepository.findAllByEmailWithDepartment(email)
                .stream()
                .map(dm -> userMapper.mapDepartment(dm.getDepartment()))
                .toList();
        response.setDepartments(departments);
    }
}
