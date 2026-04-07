package com.stk.inventory.controller;

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
import com.stk.inventory.dto.PermissionPresetResponse;
import com.stk.inventory.dto.RoleProfileResponse;
import com.stk.inventory.usecase.AdminUserManagementUseCase;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserManagementUseCase adminUserManagementService;

    public AdminUserController(AdminUserManagementUseCase adminUserManagementService) {
        this.adminUserManagementService = adminUserManagementService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserSummaryResponse>> listUsers() {
        return ResponseEntity.ok(adminUserManagementService.listUsers());
    }

    @GetMapping("/permission-options")
    public ResponseEntity<AdminPermissionOptionsResponse> getPermissionOptions() {
        return ResponseEntity.ok(adminUserManagementService.getPermissionOptions());
    }

    @PostMapping("/permission-presets")
    public ResponseEntity<PermissionPresetResponse> createPermissionPreset(
            @RequestBody AdminCreatePermissionPresetRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserManagementService.createPermissionPreset(request));
    }

    @PostMapping("/role-profiles")
    public ResponseEntity<RoleProfileResponse> createRoleProfile(
            @RequestBody AdminCreateRoleProfileRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserManagementService.createRoleProfile(request));
    }

    @DeleteMapping("/permission-presets/{presetKey}")
    public ResponseEntity<Void> deletePermissionPreset(@PathVariable String presetKey) {
        adminUserManagementService.deletePermissionPreset(presetKey);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/role-profiles/{roleProfileKey}")
    public ResponseEntity<Void> deleteRoleProfile(@PathVariable String roleProfileKey) {
        adminUserManagementService.deleteRoleProfile(roleProfileKey);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<AdminCreatedUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserManagementService.createUser(request));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<AdminUserSummaryResponse> updateUserRole(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(adminUserManagementService.updateUserRole(id, request));
    }

    @PutMapping("/{id}/name")
    public ResponseEntity<AdminUserSummaryResponse> updateUserName(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserNameRequest request
    ) {
        return ResponseEntity.ok(adminUserManagementService.updateUserName(id, request));
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<AdminUserSummaryResponse> updateUserPermissions(
            @PathVariable UUID id,
            @RequestBody AdminUpdateUserPermissionsRequest request
    ) {
        return ResponseEntity.ok(adminUserManagementService.updateUserPermissions(id, request));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<AdminPasswordResetResponse> resetPassword(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserManagementService.resetUserPassword(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        adminUserManagementService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
