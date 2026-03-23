package com.stk.inventory.dto;

import lombok.Data;
import com.stk.inventory.entity.Role;

@Data
public class AuthResponse {
    private String token;
    private String email;
    private Role role;
    private boolean passwordChangeRequired;
    private String message;
}
