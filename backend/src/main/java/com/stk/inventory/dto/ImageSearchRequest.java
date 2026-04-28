package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ImageSearchRequest {
    @NotBlank(message = "검색할 이미지를 입력해주세요.")
    private String imageData;
}
