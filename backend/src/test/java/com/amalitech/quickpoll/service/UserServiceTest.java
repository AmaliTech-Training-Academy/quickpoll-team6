package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.UserProfileResponse;
import com.amalitech.quickpoll.dto.UserUpdateRequest;
import com.amalitech.quickpoll.errorhandlers.UserNotFoundException;
import com.amalitech.quickpoll.mapper.UserMapper;
import com.amalitech.quickpoll.model.User;
import com.amalitech.quickpoll.model.enums.Role;
import com.amalitech.quickpoll.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void getUserProfile_Success() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(Role.USER);

        UserProfileResponse response = new UserProfileResponse();
        response.setId(1L);
        response.setEmail("test@example.com");
        response.setName("Test User");

        when(userRepository.findById(anyLong())).thenReturn(Optional.of(user));
        when(userMapper.toProfileResponse(any(User.class))).thenReturn(response);

        UserProfileResponse result = userService.getUserProfile(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository).findById(1L);
    }

    @Test
    void getUserProfile_UserNotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserProfile(1L));
    }

    @Test
    void getCurrentUserProfile_Success() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");

        UserProfileResponse response = new UserProfileResponse();
        response.setId(1L);
        response.setEmail("test@example.com");

        when(userMapper.toProfileResponse(any(User.class))).thenReturn(response);

        UserProfileResponse result = userService.getCurrentUserProfile(user);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(userMapper).toProfileResponse(user);
    }

    @Test
    void updateUser_Success() {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setName("Updated Name");

        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");

        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setEmail("test@example.com");
        updatedUser.setFullName("Updated Name");

        UserProfileResponse response = new UserProfileResponse();
        response.setId(1L);
        response.setName("Updated Name");

        when(userRepository.findById(anyLong())).thenReturn(Optional.of(user));
        doNothing().when(userMapper).updateUserFromRequest(any(UserUpdateRequest.class), any(User.class));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);
        when(userMapper.toProfileResponse(any(User.class))).thenReturn(response);

        UserProfileResponse result = userService.updateUser(1L, request);

        assertNotNull(result);
        assertEquals("Updated Name", result.getName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void updateUser_UserNotFound() {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setName("Updated Name");

        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.updateUser(1L, request));
        verify(userRepository, never()).save(any(User.class));
    }
}
