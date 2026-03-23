package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AdminCreatedUserResponse {
    String email;
    Role role;
    String temporaryPassword;
    boolean passwordChangeRequired;
    LocalDateTime createdAt;
}
