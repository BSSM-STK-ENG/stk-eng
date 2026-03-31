package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class AdminCreatedUserResponse {
    String name;
    String email;
    Role role;
    String roleProfileKey;
    String roleLabel;
    String permissionPreset;
    List<String> pagePermissions;
    String temporaryPassword;
    boolean passwordChangeRequired;
    LocalDateTime createdAt;
}
