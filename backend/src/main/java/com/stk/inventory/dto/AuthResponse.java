package com.stk.inventory.dto;

import lombok.Data;
import com.stk.inventory.entity.Role;

import java.util.List;

@Data
public class AuthResponse {
    private String token;
    private String name;
    private String email;
    private Role role;
    private String permissionPreset;
    private List<String> pagePermissions;
    private boolean passwordChangeRequired;
    private String message;
}
