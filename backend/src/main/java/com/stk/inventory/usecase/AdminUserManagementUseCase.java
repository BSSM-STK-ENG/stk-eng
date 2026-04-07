package com.stk.inventory.usecase;

import com.stk.inventory.dto.*;

import java.util.List;
import java.util.UUID;

public interface AdminUserManagementUseCase {
    List<AdminUserSummaryResponse> listUsers();
    AdminPermissionOptionsResponse getPermissionOptions();
    PermissionPresetResponse createPermissionPreset(AdminCreatePermissionPresetRequest request);
    RoleProfileResponse createRoleProfile(AdminCreateRoleProfileRequest request);
    void deletePermissionPreset(String presetKey);
    void deleteRoleProfile(String roleProfileKey);
    AdminCreatedUserResponse createUser(AdminCreateUserRequest request);
    AdminUserSummaryResponse updateUserRole(UUID userId, AdminUpdateUserRoleRequest request);
    AdminUserSummaryResponse updateUserName(UUID userId, AdminUpdateUserNameRequest request);
    AdminUserSummaryResponse updateUserPermissions(UUID userId, AdminUpdateUserPermissionsRequest request);
    AdminPasswordResetResponse resetUserPassword(UUID userId);
    void deleteUser(UUID userId);
}
