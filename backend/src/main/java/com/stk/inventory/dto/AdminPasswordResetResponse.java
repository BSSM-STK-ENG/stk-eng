package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminPasswordResetResponse {
    String email;
    Role role;
    String roleProfileKey;
    String roleLabel;
    String temporaryPassword;
    boolean passwordChangeRequired;
}
