package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class AdminCreateUserRequest {
    private String name;

    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @NotBlank(message = "이메일을 입력해주세요.")
    private String email;

    private String temporaryPassword;

    private Role role;

    private String roleProfileKey;

    private String permissionPreset;

    private List<String> pagePermissions;
}
