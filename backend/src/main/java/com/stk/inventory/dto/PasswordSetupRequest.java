package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordSetupRequest {
    private String currentPassword;

    private String name;

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    private String newPassword;
}
