package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class AdminUserSummaryResponse {
    UUID id;
    String name;
    String email;
    Role role;
    String roleProfileKey;
    String roleLabel;
    String permissionPreset;
    List<String> pagePermissions;
    boolean passwordChangeRequired;
    boolean emailVerified;
    LocalDateTime createdAt;
}
