package com.stk.inventory.service;

import com.stk.inventory.dto.AdminCreateUserRequest;
import com.stk.inventory.dto.AdminCreatedUserResponse;
import com.stk.inventory.dto.AdminUserSummaryResponse;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;

@Service
public class AdminUserManagementService {

    private static final String TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    private static final int TEMP_PASSWORD_LENGTH = 14;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserManagementService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<AdminUserSummaryResponse> listUsers() {
        requireSuperAdmin();
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(user -> AdminUserSummaryResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .passwordChangeRequired(user.isPasswordChangeRequired())
                        .createdAt(user.getCreatedAt())
                        .build())
                .toList();
    }

    public AdminCreatedUserResponse createUser(AdminCreateUserRequest request) {
        requireSuperAdmin();

        String email = normalizeRequired(request.getEmail(), "이메일을 입력해주세요.");
        String temporaryPassword = resolveTemporaryPassword(request.getTemporaryPassword());
        if (temporaryPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 비밀번호는 8자 이상이어야 합니다.");
        }

        Role role = request.getRole() == null ? Role.USER : request.getRole();
        if (role == Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "슈퍼 어드민 계정은 발급할 수 없습니다.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        User savedUser = userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(temporaryPassword))
                .role(role)
                .passwordChangeRequired(true)
                .build());

        return AdminCreatedUserResponse.builder()
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .temporaryPassword(temporaryPassword)
                .passwordChangeRequired(savedUser.isPasswordChangeRequired())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    private User requireSuperAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "슈퍼 어드민만 계정을 발급할 수 있습니다.");
        }

        return currentUser;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String resolveTemporaryPassword(String requestedPassword) {
        if (requestedPassword != null && !requestedPassword.trim().isEmpty()) {
            return requestedPassword.trim();
        }

        StringBuilder passwordBuilder = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int index = 0; index < TEMP_PASSWORD_LENGTH; index++) {
            int charIndex = secureRandom.nextInt(TEMP_PASSWORD_ALPHABET.length());
            passwordBuilder.append(TEMP_PASSWORD_ALPHABET.charAt(charIndex));
        }
        return passwordBuilder.toString();
    }
}
