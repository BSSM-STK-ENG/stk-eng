package com.stk.inventory.service;

import com.stk.inventory.dto.AuthRequest;
import com.stk.inventory.dto.AuthResponse;
import com.stk.inventory.dto.PasswordSetupRequest;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import com.stk.inventory.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void loginIncludesRoleAndPasswordChangeRequired() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider);
        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password");

        UserDetails principal = new org.springframework.security.core.userdetails.User(
                request.getEmail(),
                "encoded-password",
                List.of()
        );
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(authentication.getName()).thenReturn(request.getEmail());
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(tokenProvider.generateToken(principal)).thenReturn("jwt-token");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(User.builder()
                .email(request.getEmail())
                .password("encoded-password")
                .role(Role.SUPER_ADMIN)
                .passwordChangeRequired(true)
                .build()));

        AuthResponse response = authService.login(request);

        assertEquals("jwt-token", response.getToken());
        assertEquals(request.getEmail(), response.getEmail());
        assertEquals(Role.SUPER_ADMIN, response.getRole());
        assertTrue(response.isPasswordChangeRequired());
    }

    @Test
    void registerIsForbidden() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider);
        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.register(request));
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void completePasswordSetupEncodesPasswordAndClearsFlag() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .email("test@test.com")
                .password("old-encoded")
                .role(Role.USER)
                .passwordChangeRequired(true)
                .build();

        when(userRepository.findByEmail("test@test.com")).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.encode("NewPass123!")).thenReturn("new-encoded");

        authService.completePasswordSetup(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("new-encoded", captor.getValue().getPassword());
        assertFalse(captor.getValue().isPasswordChangeRequired());
    }

    @Test
    void changePasswordRequiresCurrentPasswordForActiveAccount() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .email("test@test.com")
                .password("old-encoded")
                .role(Role.USER)
                .passwordChangeRequired(false)
                .build();

        when(userRepository.findByEmail("test@test.com")).thenReturn(java.util.Optional.of(user));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.completePasswordSetup(request));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void changePasswordUpdatesActiveAccountWhenCurrentPasswordMatches() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setCurrentPassword("CurrentPass123!");
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .email("test@test.com")
                .password("old-encoded")
                .role(Role.USER)
                .passwordChangeRequired(false)
                .build();

        when(userRepository.findByEmail("test@test.com")).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches("CurrentPass123!", "old-encoded")).thenReturn(true);
        when(passwordEncoder.matches("NewPass123!", "old-encoded")).thenReturn(false);
        when(passwordEncoder.encode("NewPass123!")).thenReturn("new-encoded");

        authService.completePasswordSetup(request);

        verify(userRepository).save(argThat(saved ->
                "new-encoded".equals(saved.getPassword()) && !saved.isPasswordChangeRequired()
        ));
    }
}
