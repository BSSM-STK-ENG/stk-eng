package com.stk.inventory.mapper;

import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntityForCreate(String name,
                                  String email,
                                  String encodedPassword,
                                  Role role,
                                  String roleProfileKey,
                                  String permissionPreset,
                                  String pagePermissions) {
        return User.builder()
                .name(name)
                .email(email)
                .password(encodedPassword)
                .role(role)
                .roleProfileKey(roleProfileKey)
                .permissionPreset(permissionPreset)
                .pagePermissions(pagePermissions)
                .chatPanelEnabled(false)
                .passwordChangeRequired(true)
                .emailVerified(true)
                .build();
    }
}
