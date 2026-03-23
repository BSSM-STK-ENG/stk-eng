package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AdminUserSummaryResponse {
    UUID id;
    String email;
    Role role;
    boolean passwordChangeRequired;
    LocalDateTime createdAt;
}
