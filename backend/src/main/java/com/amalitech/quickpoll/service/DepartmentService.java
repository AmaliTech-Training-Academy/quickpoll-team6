package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.dto.DepartmentRequest;
import com.amalitech.quickpoll.dto.DepartmentResponse;
import com.amalitech.quickpoll.errorhandlers.ResourceAlreadyExistsException;
import com.amalitech.quickpoll.errorhandlers.ResourceNotFoundException;
import com.amalitech.quickpoll.model.Department;
import com.amalitech.quickpoll.model.DepartmentMember;
import com.amalitech.quickpoll.repository.DepartmentRepository;
import com.amalitech.quickpoll.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        if (departmentRepository.existsByName(request.getName())) {
            throw new ResourceAlreadyExistsException("Department with name '" + request.getName() + "' already exists");
        }
        
        List<String> existingEmails = userRepository.findEmailsByEmailIn(request.getEmails());
        List<String> invalidEmails = request.getEmails().stream()
                .filter(email -> !existingEmails.contains(email))
                .collect(Collectors.toList());
        
        Department department = Department.builder()
                .name(request.getName())
                .build();

        List<DepartmentMember> members = existingEmails.stream()
                .distinct()
                .map(email -> DepartmentMember.builder()
                        .email(email)
                        .department(department)
                        .build())
                .collect(Collectors.toList());
        department.setMembers(members);
        Department savedDepartment = departmentRepository.save(department);
        
        DepartmentResponse response = mapToResponse(savedDepartment);
        response.setFailedEmails(invalidEmails);
        return response;
    }

    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAllWithMembers().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DepartmentResponse getDepartmentById(Long id) {
        Department department = departmentRepository.findByIdWithMembers(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        return mapToResponse(department);
    }

    @Transactional
    public DepartmentResponse addEmailsToDepartment(Long departmentId, List<String> emails) {
        Department department = departmentRepository.findByIdWithMembers(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        
        List<String> existingEmails = userRepository.findEmailsByEmailIn(emails);
        List<String> invalidEmails = emails.stream()
                .filter(email -> !existingEmails.contains(email))
                .collect(Collectors.toList());
        
        List<String> existingMemberEmails = department.getMembers().stream()
                .map(DepartmentMember::getEmail)
                .collect(Collectors.toList());
        
        List<DepartmentMember> newMembers = existingEmails.stream()
                .distinct()
                .filter(email -> !existingMemberEmails.contains(email))
                .map(email -> DepartmentMember.builder()
                        .email(email)
                        .department(department)
                        .build())
                .collect(Collectors.toList());
        
        department.getMembers().addAll(newMembers);
        Department savedDepartment = departmentRepository.save(department);
        
        DepartmentResponse response = mapToResponse(savedDepartment);
        response.setFailedEmails(invalidEmails);
        return response;
    }
    
    private DepartmentResponse mapToResponse(Department department) {
        return DepartmentResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .emails(department.getMembers().stream()
                        .map(DepartmentMember::getEmail)
                        .collect(Collectors.toList()))
                .failedEmails(java.util.Collections.emptyList())
                .build();
    }
}
