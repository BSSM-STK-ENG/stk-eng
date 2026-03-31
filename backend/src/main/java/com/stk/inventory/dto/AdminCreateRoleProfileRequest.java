package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Data;

@Data
public class AdminCreateRoleProfileRequest {
    private String label;
    private String description;
    private Role baseRole;
}
