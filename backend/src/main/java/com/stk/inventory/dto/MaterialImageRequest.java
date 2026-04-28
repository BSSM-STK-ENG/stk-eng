package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MaterialImageRequest {
    @NotBlank(message = "자재 이미지를 입력해주세요.")
    private String imageUrl;
}
