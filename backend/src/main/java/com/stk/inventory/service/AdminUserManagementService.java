package com.stk.inventory.service;

import com.stk.inventory.dto.AdminCreatePermissionPresetRequest;
import com.stk.inventory.dto.AdminCreateRoleProfileRequest;
import com.stk.inventory.dto.AdminCreateUserRequest;
import com.stk.inventory.dto.AdminCreatedUserResponse;
import com.stk.inventory.dto.AdminPermissionOptionsResponse;
import com.stk.inventory.dto.AdminPasswordResetResponse;
import com.stk.inventory.dto.AdminUpdateUserPermissionsRequest;
import com.stk.inventory.dto.AdminUpdateUserRoleRequest;
import com.stk.inventory.dto.AdminUpdateUserNameRequest;
import com.stk.inventory.dto.AdminUserSummaryResponse;
import com.stk.inventory.entity.PagePermission;
import com.stk.inventory.dto.PermissionPresetResponse;
import com.stk.inventory.dto.RoleProfileResponse;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class AdminUserManagementService implements com.stk.inventory.usecase.AdminUserManagementUseCase {

    public static final String INITIAL_ISSUED_PASSWORD = "1234";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserPermissionService userPermissionService;

    public AdminUserManagementService(UserRepository userRepository, PasswordEncoder passwordEncoder, UserPermissionService userPermissionService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userPermissionService = userPermissionService;
    }

    public List<AdminUserSummaryResponse> listUsers() {
        requireSuperAdmin();
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSummary)
                .toList();
    }

    public AdminCreatedUserResponse createUser(AdminCreateUserRequest request) {
        requireSuperAdmin();

        String name = normalizeOptionalName(request.getName());
        String email = normalizeRequired(request.getEmail(), "이메일을 입력해주세요.");

        UserPermissionService.RoleProfileDefinition roleProfile = userPermissionService.resolveRoleProfileDefinition(
                request.getRoleProfileKey() != null ? request.getRoleProfileKey() : request.getRole() == null ? null : request.getRole().name(),
                request.getRole()
        );
        Role role = roleProfile.baseRole();
        if (role == Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "슈퍼 어드민 계정은 발급할 수 없습니다.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }
        ensureNameAvailable(name, null);
        String permissionPreset = userPermissionService.resolvePresetDefinition(request.getPermissionPreset(), role).key();
        String serializedPermissions = userPermissionService.serialize(
                userPermissionService.normalizeAssignablePermissions(request.getPagePermissions(), permissionPreset, role)
        );

        User savedUser = userRepository.save(User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(INITIAL_ISSUED_PASSWORD))
                .role(role)
                .roleProfileKey(roleProfile.key())
                .permissionPreset(permissionPreset)
                .pagePermissions(serializedPermissions)
                .chatPanelEnabled(false)
                .passwordChangeRequired(true)
                .emailVerified(true)
                .build());

        return AdminCreatedUserResponse.builder()
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .roleProfileKey(userPermissionService.resolveRoleProfileDefinition(savedUser.getRoleProfileKey(), savedUser.getRole()).key())
                .roleLabel(userPermissionService.resolveRoleProfileDefinition(savedUser.getRoleProfileKey(), savedUser.getRole()).label())
                .permissionPreset(userPermissionService.resolvePresetKey(savedUser))
                .pagePermissions(userPermissionService.resolvePermissions(savedUser).stream().map(PagePermission::getKey).toList())
                .temporaryPassword(INITIAL_ISSUED_PASSWORD)
                .passwordChangeRequired(savedUser.isPasswordChangeRequired())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    public AdminUserSummaryResponse updateUserRole(UUID userId, AdminUpdateUserRoleRequest request) {
        User currentUser = requireSuperAdmin();
        User targetUser = requireManageableUser(userId, currentUser);

        UserPermissionService.RoleProfileDefinition roleProfile = userPermissionService.resolveRoleProfileDefinition(
                request.getRoleProfileKey() != null ? request.getRoleProfileKey() : request.getRole() == null ? null : request.getRole().name(),
                request.getRole()
        );
        Role nextRole = roleProfile.baseRole();
        if (nextRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "권한을 선택해주세요.");
        }
        if (nextRole == Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "슈퍼 어드민 권한은 부여할 수 없습니다.");
        }

        targetUser.setRole(nextRole);
        targetUser.setRoleProfileKey(roleProfile.key());
        return toSummary(userRepository.save(targetUser));
    }

    public AdminUserSummaryResponse updateUserName(UUID userId, AdminUpdateUserNameRequest request) {
        User currentUser = requireSuperAdmin();
        User targetUser = requireManageableUser(userId, currentUser);
        String normalizedName = normalizeRequiredName(request.getName());
        ensureNameAvailable(normalizedName, targetUser.getId());
        targetUser.setName(normalizedName);
        return toSummary(userRepository.save(targetUser));
    }

    public AdminUserSummaryResponse updateUserPermissions(UUID userId, AdminUpdateUserPermissionsRequest request) {
        User currentUser = requireSuperAdmin();
        User targetUser = requireManageableUser(userId, currentUser);

        String permissionPreset = userPermissionService.resolvePresetDefinition(request.getPermissionPreset(), targetUser.getRole()).key();
        String serializedPermissions = userPermissionService.serialize(
                userPermissionService.normalizeAssignablePermissions(request.getPagePermissions(), permissionPreset, targetUser.getRole())
        );

        targetUser.setPermissionPreset(permissionPreset);
        targetUser.setPagePermissions(serializedPermissions);
        return toSummary(userRepository.save(targetUser));
    }

    public AdminPasswordResetResponse resetUserPassword(UUID userId) {
        User currentUser = requireSuperAdmin();
        User targetUser = requireManageableUser(userId, currentUser);

        targetUser.setPassword(passwordEncoder.encode(INITIAL_ISSUED_PASSWORD));
        targetUser.setPasswordChangeRequired(true);
        User savedUser = userRepository.save(targetUser);

        return AdminPasswordResetResponse.builder()
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .roleProfileKey(userPermissionService.resolveRoleProfileDefinition(savedUser.getRoleProfileKey(), savedUser.getRole()).key())
                .roleLabel(userPermissionService.resolveRoleProfileDefinition(savedUser.getRoleProfileKey(), savedUser.getRole()).label())
                .temporaryPassword(INITIAL_ISSUED_PASSWORD)
                .passwordChangeRequired(savedUser.isPasswordChangeRequired())
                .build();
    }

    public void deleteUser(UUID userId) {
        User currentUser = requireSuperAdmin();
        User targetUser = requireManageableUser(userId, currentUser);

        try {
            userRepository.delete(targetUser);
            userRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 거래나 마감 이력에 사용된 계정은 삭제할 수 없습니다.");
        }
    }

    public AdminPermissionOptionsResponse getPermissionOptions() {
        requireSuperAdmin();
        return AdminPermissionOptionsResponse.builder()
                .roleProfiles(userPermissionService.listRoleProfiles())
                .pages(userPermissionService.listPagePermissions())
                .presets(userPermissionService.listPresets())
                .build();
    }

    public PermissionPresetResponse createPermissionPreset(AdminCreatePermissionPresetRequest request) {
        requireSuperAdmin();
        return userPermissionService.createCustomPreset(
                request.getLabel(),
                request.getDescription(),
                request.getPagePermissions()
        );
    }

    public void deletePermissionPreset(String presetKey) {
        requireSuperAdmin();
        userPermissionService.deleteCustomPreset(presetKey, userRepository.existsByPermissionPreset(presetKey));
    }

    public RoleProfileResponse createRoleProfile(AdminCreateRoleProfileRequest request) {
        requireSuperAdmin();
        return userPermissionService.createCustomRoleProfile(
                request.getLabel(),
                request.getDescription(),
                request.getBaseRole()
        );
    }

    public void deleteRoleProfile(String roleProfileKey) {
        requireSuperAdmin();
        userPermissionService.deleteCustomRoleProfile(roleProfileKey, userRepository.existsByRoleProfileKey(roleProfileKey));
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

    private User requireManageableUser(UUID userId, User currentUser) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        if (targetUser.getRole() == Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "슈퍼 어드민 계정은 변경할 수 없습니다.");
        }
        if (currentUser.getId() != null && currentUser.getId().equals(targetUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신의 계정은 여기서 변경할 수 없습니다.");
        }

        return targetUser;
    }

    private AdminUserSummaryResponse toSummary(User user) {
        return AdminUserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .roleProfileKey(userPermissionService.resolveRoleProfileDefinition(user.getRoleProfileKey(), user.getRole()).key())
                .roleLabel(userPermissionService.resolveRoleProfileDefinition(user.getRoleProfileKey(), user.getRole()).label())
                .permissionPreset(userPermissionService.resolvePresetKey(user))
                .pagePermissions(userPermissionService.resolvePermissions(user).stream().map(PagePermission::getKey).toList())
                .passwordChangeRequired(user.isPasswordChangeRequired())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String normalizeRequiredName(String value) {
        String normalized = normalizeOptionalName(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해주세요.");
        }
        return normalized;
    }

    private String normalizeOptionalName(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름은 60자 이하로 입력해주세요.");
        }
        return normalized;
    }

    private void ensureNameAvailable(String name, UUID currentUserId) {
        if (name == null) {
            return;
        }
        boolean exists = currentUserId == null
                ? userRepository.existsByNameIgnoreCase(name)
                : userRepository.existsByNameIgnoreCaseAndIdNot(name, currentUserId);
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이름입니다.");
        }
    }
}
