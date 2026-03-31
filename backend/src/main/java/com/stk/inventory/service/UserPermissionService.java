package com.stk.inventory.service;

import com.stk.inventory.dto.PagePermissionResponse;
import com.stk.inventory.dto.PermissionPresetResponse;
import com.stk.inventory.dto.RoleProfileResponse;
import com.stk.inventory.entity.CustomPermissionPreset;
import com.stk.inventory.entity.CustomRoleProfile;
import com.stk.inventory.entity.PagePermission;
import com.stk.inventory.entity.PermissionPreset;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.CustomPermissionPresetRepository;
import com.stk.inventory.repository.CustomRoleProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserPermissionService {

    private final CustomPermissionPresetRepository customPermissionPresetRepository;
    private final CustomRoleProfileRepository customRoleProfileRepository;

    public UserPermissionService(
            CustomPermissionPresetRepository customPermissionPresetRepository,
            CustomRoleProfileRepository customRoleProfileRepository
    ) {
        this.customPermissionPresetRepository = customPermissionPresetRepository;
        this.customRoleProfileRepository = customRoleProfileRepository;
    }

    public Set<PagePermission> resolvePermissions(User user) {
        if (user.getRole() == Role.SUPER_ADMIN) {
            return new LinkedHashSet<>(Arrays.asList(PagePermission.values()));
        }

        if (user.getPagePermissions() == null || user.getPagePermissions().isBlank()) {
            return new LinkedHashSet<>(resolvePresetDefinition(user.getPermissionPreset(), user.getRole()).permissions());
        }

        return deserialize(user.getPagePermissions());
    }

    public String resolvePresetKey(User user) {
        if (user.getRole() == Role.SUPER_ADMIN) {
            return "SUPER_ADMIN";
        }
        if (user.getPermissionPreset() == null || user.getPermissionPreset().isBlank()) {
            return defaultPresetForRole(user.getRole()).getKey();
        }
        return resolvePresetDefinition(user.getPermissionPreset(), user.getRole()).key();
    }

    public RoleProfileDefinition resolveRoleProfileDefinition(String roleProfileKey, Role fallbackRole) {
        if (fallbackRole == Role.SUPER_ADMIN) {
            return new RoleProfileDefinition("SUPER_ADMIN", "슈퍼 어드민", "전체 관리 권한", Role.SUPER_ADMIN, true);
        }

        if (roleProfileKey == null || roleProfileKey.isBlank()) {
            Role effectiveRole = fallbackRole == null ? Role.USER : fallbackRole;
            return systemRoleProfile(effectiveRole);
        }

        for (Role role : Role.values()) {
            if (role.name().equalsIgnoreCase(roleProfileKey)) {
                return systemRoleProfile(role);
            }
        }

        CustomRoleProfile customRoleProfile = customRoleProfileRepository.findByKey(roleProfileKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 권한 역할입니다: " + roleProfileKey));
        return new RoleProfileDefinition(
                customRoleProfile.getKey(),
                customRoleProfile.getLabel(),
                customRoleProfile.getDescription(),
                customRoleProfile.getBaseRole(),
                false
        );
    }

    public List<RoleProfileResponse> listRoleProfiles() {
        List<RoleProfileResponse> systemProfiles = List.of(
                toRoleProfileResponse(systemRoleProfile(Role.USER)),
                toRoleProfileResponse(systemRoleProfile(Role.ADMIN)),
                toRoleProfileResponse(systemRoleProfile(Role.SUPER_ADMIN))
        );
        List<RoleProfileResponse> customProfiles = customRoleProfileRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(profile -> RoleProfileResponse.builder()
                        .key(profile.getKey())
                        .label(profile.getLabel())
                        .description(profile.getDescription())
                        .baseRole(profile.getBaseRole())
                        .systemProfile(false)
                        .build())
                .toList();
        return java.util.stream.Stream.concat(systemProfiles.stream(), customProfiles.stream()).toList();
    }

    public RoleProfileResponse createCustomRoleProfile(String label, String description, Role baseRole) {
        String normalizedLabel = normalizePresetLabel(label);
        String normalizedDescription = normalizePresetDescription(description);
        if (baseRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기준 권한을 선택해주세요.");
        }
        if (baseRole == Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "슈퍼 어드민 역할은 사용자 정의로 만들 수 없습니다.");
        }
        if (customRoleProfileRepository.existsByLabelIgnoreCase(normalizedLabel)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 권한 역할 이름입니다.");
        }

        CustomRoleProfile saved = customRoleProfileRepository.save(CustomRoleProfile.builder()
                .key("ROLE_PROFILE_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                .label(normalizedLabel)
                .description(normalizedDescription)
                .baseRole(baseRole)
                .build());

        return RoleProfileResponse.builder()
                .key(saved.getKey())
                .label(saved.getLabel())
                .description(saved.getDescription())
                .baseRole(saved.getBaseRole())
                .systemProfile(false)
                .build();
    }

    public void deleteCustomRoleProfile(String roleProfileKey, boolean inUse) {
        if (roleProfileKey == null || roleProfileKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제할 권한 역할 키가 없습니다.");
        }
        if (java.util.Arrays.stream(Role.values()).anyMatch(role -> role.name().equalsIgnoreCase(roleProfileKey))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 권한 역할은 삭제할 수 없습니다.");
        }
        if (inUse) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 사용 중인 권한 역할은 삭제할 수 없습니다.");
        }
        CustomRoleProfile roleProfile = customRoleProfileRepository.findByKey(roleProfileKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "권한 역할을 찾을 수 없습니다."));
        customRoleProfileRepository.delete(roleProfile);
    }

    public PermissionPreset resolvePreset(String presetKey, Role role) {
        PresetDefinition presetDefinition = resolvePresetDefinition(presetKey, role);
        if (!presetDefinition.systemPreset()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 프리셋이 아닌 사용자 프리셋입니다.");
        }
        return PermissionPreset.fromKey(presetDefinition.key());
    }

    public PresetDefinition resolvePresetDefinition(String presetKey, Role role) {
        if (presetKey == null || presetKey.isBlank()) {
            PermissionPreset preset = defaultPresetForRole(role);
            return new PresetDefinition(preset.getKey(), preset.getLabel(), preset.getDescription(), preset.getPermissions(), true);
        }

        for (PermissionPreset preset : PermissionPreset.values()) {
            if (preset.getKey().equalsIgnoreCase(presetKey)) {
                return new PresetDefinition(preset.getKey(), preset.getLabel(), preset.getDescription(), preset.getPermissions(), true);
            }
        }

        CustomPermissionPreset customPreset = customPermissionPresetRepository.findByKey(presetKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 권한 프리셋입니다: " + presetKey));
        return new PresetDefinition(
                customPreset.getKey(),
                customPreset.getLabel(),
                customPreset.getDescription(),
                deserialize(customPreset.getPagePermissions()),
                false
        );
    }

    public PermissionPreset defaultPresetForRole(Role role) {
        if (role == Role.ADMIN) {
            return PermissionPreset.OPERATOR;
        }
        return PermissionPreset.VIEWER;
    }

    public Set<PagePermission> normalizeAssignablePermissions(Collection<String> rawPermissions, String presetKey, Role role) {
        PresetDefinition preset = resolvePresetDefinition(presetKey, role);
        if (rawPermissions == null) {
            return new LinkedHashSet<>(preset.permissions());
        }

        Set<PagePermission> parsed = new LinkedHashSet<>();
        for (String rawPermission : rawPermissions) {
            if (rawPermission == null || rawPermission.isBlank()) {
                continue;
            }
            PagePermission permission;
            try {
                permission = PagePermission.fromKey(rawPermission);
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
            }
            if (permission == PagePermission.ADMIN_ACCOUNTS) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용자 관리 권한은 슈퍼 어드민 전용입니다.");
            }
            parsed.add(permission);
        }
        return parsed;
    }

    public String serialize(Set<PagePermission> permissions) {
        return permissions.stream()
                .map(PagePermission::getKey)
                .collect(Collectors.joining(","));
    }

    public Set<PagePermission> deserialize(String value) {
        Set<PagePermission> permissions = new LinkedHashSet<>();
        if (value == null || value.isBlank()) {
            return permissions;
        }
        for (String token : value.split(",")) {
            String trimmed = token.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            permissions.add(PagePermission.fromKey(trimmed));
        }
        return permissions;
    }

    public List<PagePermissionResponse> listPagePermissions() {
        return Arrays.stream(PagePermission.values())
                .filter(permission -> permission != PagePermission.ADMIN_ACCOUNTS)
                .map(permission -> PagePermissionResponse.builder()
                        .key(permission.getKey())
                        .label(permission.getLabel())
                        .path(permission.getPath())
                        .build())
                .toList();
    }

    public List<PermissionPresetResponse> listPresets() {
        List<PermissionPresetResponse> systemPresets = Arrays.stream(PermissionPreset.values())
                .map(preset -> PermissionPresetResponse.builder()
                        .key(preset.getKey())
                        .label(preset.getLabel())
                        .description(preset.getDescription())
                        .systemPreset(true)
                        .pagePermissions(preset.getPermissions().stream().map(PagePermission::getKey).toList())
                        .build())
                .toList();

        List<PermissionPresetResponse> customPresets = customPermissionPresetRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(preset -> PermissionPresetResponse.builder()
                        .key(preset.getKey())
                        .label(preset.getLabel())
                        .description(preset.getDescription())
                        .systemPreset(false)
                        .pagePermissions(deserialize(preset.getPagePermissions()).stream().map(PagePermission::getKey).toList())
                        .build())
                .toList();

        return java.util.stream.Stream.concat(systemPresets.stream(), customPresets.stream()).toList();
    }

    private RoleProfileDefinition systemRoleProfile(Role role) {
        return switch (role) {
            case USER -> new RoleProfileDefinition("USER", "일반 사용자", "조회 중심 기본 역할", Role.USER, true);
            case ADMIN -> new RoleProfileDefinition("ADMIN", "관리자", "입출고와 관리 기능을 포함한 기본 역할", Role.ADMIN, true);
            case SUPER_ADMIN -> new RoleProfileDefinition("SUPER_ADMIN", "슈퍼 어드민", "전체 관리 권한", Role.SUPER_ADMIN, true);
        };
    }

    private RoleProfileResponse toRoleProfileResponse(RoleProfileDefinition definition) {
        return RoleProfileResponse.builder()
                .key(definition.key())
                .label(definition.label())
                .description(definition.description())
                .baseRole(definition.baseRole())
                .systemProfile(definition.systemProfile())
                .build();
    }

    public PermissionPresetResponse createCustomPreset(String label, String description, Collection<String> rawPermissions) {
        String normalizedLabel = normalizePresetLabel(label);
        String normalizedDescription = normalizePresetDescription(description);
        if (customPermissionPresetRepository.existsByLabelIgnoreCase(normalizedLabel)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 프리셋 이름입니다.");
        }

        Set<PagePermission> permissions = normalizeAssignablePermissions(rawPermissions, PermissionPreset.VIEWER.getKey(), Role.USER);
        if (permissions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프리셋에 포함할 페이지를 하나 이상 선택해주세요.");
        }

        CustomPermissionPreset savedPreset = customPermissionPresetRepository.save(CustomPermissionPreset.builder()
                .key("CUSTOM_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                .label(normalizedLabel)
                .description(normalizedDescription)
                .pagePermissions(serialize(permissions))
                .build());

        return PermissionPresetResponse.builder()
                .key(savedPreset.getKey())
                .label(savedPreset.getLabel())
                .description(savedPreset.getDescription())
                .systemPreset(false)
                .pagePermissions(permissions.stream().map(PagePermission::getKey).toList())
                .build();
    }

    public void deleteCustomPreset(String presetKey, boolean inUse) {
        if (presetKey == null || presetKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제할 프리셋 키가 없습니다.");
        }
        if (Arrays.stream(PermissionPreset.values()).anyMatch(preset -> preset.getKey().equalsIgnoreCase(presetKey))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 프리셋은 삭제할 수 없습니다.");
        }
        if (inUse) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 사용 중인 프리셋은 삭제할 수 없습니다.");
        }

        CustomPermissionPreset preset = customPermissionPresetRepository.findByKey(presetKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "권한 프리셋을 찾을 수 없습니다."));
        customPermissionPresetRepository.delete(preset);
    }

    private String normalizePresetLabel(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프리셋 이름을 입력해주세요.");
        }
        if (normalized.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프리셋 이름은 80자 이하로 입력해주세요.");
        }
        return normalized;
    }

    private String normalizePresetDescription(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > 160) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프리셋 설명은 160자 이하로 입력해주세요.");
        }
        return normalized;
    }

    public record PresetDefinition(
            String key,
            String label,
            String description,
            Set<PagePermission> permissions,
            boolean systemPreset
    ) {
    }

    public record RoleProfileDefinition(
            String key,
            String label,
            String description,
            Role baseRole,
            boolean systemProfile
    ) {
    }
}
