package com.stk.inventory.service;

import com.stk.inventory.dto.AuthRequest;
import com.stk.inventory.dto.AuthResponse;
import com.stk.inventory.dto.EmailVerificationResponse;
import com.stk.inventory.dto.PasswordSetupRequest;
import com.stk.inventory.dto.RegisterRequest;
import com.stk.inventory.dto.RegisterResponse;
import com.stk.inventory.entity.PermissionPreset;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.CustomPermissionPresetRepository;
import com.stk.inventory.repository.CustomRoleProfileRepository;
import com.stk.inventory.repository.UserRepository;
import com.stk.inventory.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
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

    private UserPermissionService userPermissionService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private VerificationEmailService verificationEmailService;

    @Mock
    private CustomPermissionPresetRepository customPermissionPresetRepository;

    @Mock
    private CustomRoleProfileRepository customRoleProfileRepository;

    @BeforeEach
    void setUpPermissionService() {
        userPermissionService = new UserPermissionService(customPermissionPresetRepository, customRoleProfileRepository);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void loginIncludesRoleAndPasswordChangeRequired() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
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
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(tokenProvider.generateToken(principal)).thenReturn("jwt-token");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(User.builder()
                .name("슈퍼어드민")
                .email(request.getEmail())
                .password("encoded-password")
                .role(Role.SUPER_ADMIN)
                .permissionPreset(PermissionPreset.MANAGER.getKey())
                .passwordChangeRequired(true)
                .emailVerified(true)
                .build()));

        AuthResponse response = authService.login(request);

        assertEquals("jwt-token", response.getToken());
        assertEquals("슈퍼어드민", response.getName());
        assertEquals(request.getEmail(), response.getEmail());
        assertEquals(Role.SUPER_ADMIN, response.getRole());
        assertFalse(response.getPagePermissions().isEmpty());
        assertTrue(response.isPasswordChangeRequired());
    }

    @Test
    void completePasswordSetupEncodesPasswordAndClearsFlag() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setName("현장담당");
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .name("작업자")
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
        assertEquals("현장담당", captor.getValue().getName());
        assertFalse(captor.getValue().isPasswordChangeRequired());
    }

    @Test
    void changePasswordRequiresCurrentPasswordForActiveAccount() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .name("작업자")
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
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        PasswordSetupRequest request = new PasswordSetupRequest();
        request.setName("작업자");
        request.setCurrentPassword("CurrentPass123!");
        request.setNewPassword("NewPass123!");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@test.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = User.builder()
                .name("작업자")
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

    @Test
    void loginRejectsUnverifiedEmail() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        AuthRequest request = new AuthRequest();
        request.setEmail("pending@test.com");
        request.setPassword("password");

        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(User.builder()
                .email(request.getEmail())
                .password("encoded-password")
                .role(Role.USER)
                .emailVerified(false)
                .build()));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.login(request));
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void registerCreatesPendingUserAndSendsVerificationEmail() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        RegisterRequest request = new RegisterRequest();
        request.setName("신규사용자");
        request.setEmail("new@test.com");
        request.setPassword("Password123!");

        when(userRepository.findByEmail("new@test.com")).thenReturn(java.util.Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterResponse response = authService.register(request);

        assertEquals("new@test.com", response.getEmail());
        verify(userRepository).save(argThat(saved ->
                "new@test.com".equals(saved.getEmail())
                        && "신규사용자".equals(saved.getName())
                        && saved.getRole() == Role.USER
                        && PermissionPreset.VIEWER.getKey().equals(saved.getPermissionPreset())
                        && saved.getPagePermissions() != null
                        && !saved.isEmailVerified()
                        && !saved.isPasswordChangeRequired()
                        && saved.getEmailVerificationToken() != null
        ));
        verify(verificationEmailService).sendSignupVerification(any(User.class));
    }

    @Test
    void verifyEmailMarksUserVerified() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
        User user = User.builder()
                .email("verify@test.com")
                .password("encoded")
                .role(Role.USER)
                .emailVerified(false)
                .emailVerificationToken("verify-token")
                .emailVerificationExpiresAt(java.time.LocalDateTime.now().plusHours(1))
                .build();

        when(userRepository.findByEmailVerificationToken("verify-token")).thenReturn(java.util.Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmailVerificationResponse response = authService.verifyEmail("verify-token");

        assertEquals("verify@test.com", response.getEmail());
        assertTrue(user.isEmailVerified());
        assertNull(user.getEmailVerificationToken());
        assertNull(user.getEmailVerificationExpiresAt());
    }

    @Test
    void completePasswordSetupRequiresNameWhenMissing() {
        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, tokenProvider, verificationEmailService, userPermissionService, 24);
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

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.completePasswordSetup(request));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }
}
