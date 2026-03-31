package com.stk.inventory.service;

import com.stk.inventory.dto.AuthRequest;
import com.stk.inventory.dto.AuthResponse;
import com.stk.inventory.dto.EmailVerificationResponse;
import com.stk.inventory.dto.PasswordSetupRequest;
import com.stk.inventory.dto.RegisterRequest;
import com.stk.inventory.dto.RegisterResponse;
import com.stk.inventory.entity.PagePermission;
import com.stk.inventory.entity.PermissionPreset;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import com.stk.inventory.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final VerificationEmailService verificationEmailService;
    private final UserPermissionService userPermissionService;
    private final long verificationExpirationHours;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider,
                       VerificationEmailService verificationEmailService,
                       UserPermissionService userPermissionService,
                       @Value("${app.auth.verification-expiration-hours:24}") long verificationExpirationHours) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.verificationEmailService = verificationEmailService;
        this.userPermissionService = userPermissionService;
        this.verificationExpirationHours = verificationExpirationHours;
    }

    public AuthResponse login(AuthRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        String normalizedPassword = normalizePassword(request.getPassword());

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, normalizedPassword)
            );
        } catch (AuthenticationException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이메일 인증이 완료되지 않았습니다. 받은 편지함에서 인증 링크를 확인해주세요.");
        }

        String jwt = tokenProvider.generateToken(
                (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal()
        );

        AuthResponse response = new AuthResponse();
        response.setToken(jwt);
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setPermissionPreset(userPermissionService.resolvePresetKey(user));
        response.setPagePermissions(userPermissionService.resolvePermissions(user).stream().map(PagePermission::getKey).toList());
        response.setPasswordChangeRequired(user.isPasswordChangeRequired());
        response.setMessage("Success");
        return response;
    }

    public RegisterResponse register(RegisterRequest request) {
        String normalizedName = normalizeName(request.getName());
        String normalizedEmail = normalizeEmail(request.getEmail());
        String normalizedPassword = normalizePassword(request.getPassword());
        String encodedPassword = passwordEncoder.encode(normalizedPassword);
        String verificationToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(Math.max(1L, verificationExpirationHours));

        User user = userRepository.findByEmail(normalizedEmail)
                .map(existing -> preparePendingRegistration(existing, normalizedName, encodedPassword, verificationToken, expiresAt))
                .orElseGet(() -> {
                    ensureNameAvailable(normalizedName, null);
                    return User.builder()
                            .name(normalizedName)
                            .email(normalizedEmail)
                            .password(encodedPassword)
                            .role(Role.USER)
                            .permissionPreset(PermissionPreset.VIEWER.getKey())
                            .pagePermissions(userPermissionService.serialize(PermissionPreset.VIEWER.getPermissions()))
                            .chatPanelEnabled(false)
                            .passwordChangeRequired(false)
                            .emailVerified(false)
                            .emailVerificationToken(verificationToken)
                            .emailVerificationExpiresAt(expiresAt)
                            .build();
                });

        User savedUser = userRepository.save(user);
        verificationEmailService.sendSignupVerification(savedUser);

        return RegisterResponse.builder()
                .email(savedUser.getEmail())
                .message("인증 메일을 보냈습니다. 받은 편지함에서 링크를 눌러 가입을 완료해주세요.")
                .build();
    }

    public EmailVerificationResponse verifyEmail(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증 토큰이 없습니다.");
        }

        User user = userRepository.findByEmailVerificationToken(token.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 인증 링크입니다."));

        if (user.isEmailVerified()) {
            return EmailVerificationResponse.builder()
                    .email(user.getEmail())
                    .message("이미 인증이 완료된 계정입니다. 로그인해 주세요.")
                    .build();
        }

        if (user.getEmailVerificationExpiresAt() == null || user.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증 링크가 만료되었습니다. 같은 이메일로 다시 회원가입을 진행해주세요.");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);

        return EmailVerificationResponse.builder()
                .email(user.getEmail())
                .message("이메일 인증이 완료되었습니다. 로그인해 주세요.")
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해주세요.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.isBlank() || !normalizedEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 이메일 형식이 아닙니다.");
        }
        return normalizedEmail;
    }

    private String normalizePassword(String password) {
        if (password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호를 입력해주세요.");
        }

        String normalizedPassword = password.trim();
        if (normalizedPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다.");
        }
        return normalizedPassword;
    }

    public void completePasswordSetup(PasswordSetupRequest request) {
        String normalizedName = normalizeOptionalName(request.getName());
        String newPassword = request.getNewPassword();
        if (newPassword == null || newPassword.trim().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다.");
        }
        newPassword = newPassword.trim();

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!user.isPasswordChangeRequired()) {
            String currentPassword = request.getCurrentPassword();
            if (currentPassword == null || currentPassword.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호를 입력해주세요.");
            }
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.");
            }
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 다른 비밀번호를 입력해주세요.");
        }

        if (user.isPasswordChangeRequired() || isBlank(user.getName())) {
            normalizedName = normalizeName(request.getName());
        }

        if (normalizedName != null && !normalizedName.equalsIgnoreCase(user.getName())) {
            ensureNameAvailable(normalizedName, user.getId());
            user.setName(normalizedName);
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangeRequired(false);
        userRepository.save(user);
    }

    private User preparePendingRegistration(User existing, String normalizedName, String encodedPassword, String verificationToken, LocalDateTime expiresAt) {
        if (existing.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다. 로그인해 주세요.");
        }

        ensureNameAvailable(normalizedName, existing.getId());
        existing.setName(normalizedName);
        existing.setPassword(encodedPassword);
        existing.setRole(Role.USER);
        existing.setPermissionPreset(PermissionPreset.VIEWER.getKey());
        existing.setPagePermissions(userPermissionService.serialize(PermissionPreset.VIEWER.getPermissions()));
        existing.setPasswordChangeRequired(false);
        existing.setEmailVerified(false);
        existing.setEmailVerificationToken(verificationToken);
        existing.setEmailVerificationExpiresAt(expiresAt);
        return existing;
    }

    private String normalizeName(String name) {
        String normalizedName = normalizeOptionalName(name);
        if (normalizedName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해주세요.");
        }
        return normalizedName;
    }

    private String normalizeOptionalName(String name) {
        if (name == null) {
            return null;
        }
        String normalizedName = name.trim();
        if (normalizedName.isBlank()) {
            return null;
        }
        if (normalizedName.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름은 60자 이하로 입력해주세요.");
        }
        return normalizedName;
    }

    private void ensureNameAvailable(String normalizedName, java.util.UUID currentUserId) {
        if (currentUserId == null) {
            if (userRepository.existsByNameIgnoreCase(normalizedName)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이름입니다.");
            }
            return;
        }
        if (userRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, currentUserId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이름입니다.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
