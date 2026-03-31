package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateUserRoleRequest {

    private Role role;

    private String roleProfileKey;
}
