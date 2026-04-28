package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ImageSearchRequest {
    @NotBlank(message = "검색할 이미지를 입력해주세요.")
    @Size(max = 7_000_000, message = "이미지는 5MB 이하로 업로드해주세요.")
    private String imageData;
}
