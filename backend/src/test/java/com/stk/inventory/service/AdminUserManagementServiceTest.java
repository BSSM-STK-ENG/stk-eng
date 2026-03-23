package com.stk.inventory.service;

import com.stk.inventory.dto.AdminCreateUserRequest;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserManagementServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void superAdminCanIssueManagedAccount() {
        AdminUserManagementService service = new AdminUserManagementService(userRepository, passwordEncoder);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userRepository.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userRepository.existsByEmail("issued@test.com")).thenReturn(false);
        when(passwordEncoder.encode(AdminUserManagementService.INITIAL_ISSUED_PASSWORD)).thenReturn("encoded-temp-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });

        AdminCreateUserRequest request = new AdminCreateUserRequest();
        request.setEmail("issued@test.com");
        request.setRole(Role.ADMIN);

        var response = service.createUser(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals(Role.ADMIN, captor.getValue().getRole());
        assertFalse(captor.getValue().isChatPanelEnabled());
        assertTrue(captor.getValue().isPasswordChangeRequired());
        assertEquals("issued@test.com", response.getEmail());
        assertEquals(Role.ADMIN, response.getRole());
        assertTrue(response.isPasswordChangeRequired());
        assertEquals(AdminUserManagementService.INITIAL_ISSUED_PASSWORD, response.getTemporaryPassword());
    }

    @Test
    void nonSuperAdminCannotManageAccounts() {
        AdminUserManagementService service = new AdminUserManagementService(userRepository, passwordEncoder);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin@test.com", "token")
        );
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(User.builder()
                .email("admin@test.com")
                .role(Role.ADMIN)
                .password("encoded")
                .build()));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, service::listUsers);
        assertEquals(403, exception.getStatusCode().value());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }
}
