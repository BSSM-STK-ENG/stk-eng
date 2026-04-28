package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QuickSearchRequest {
    @NotBlank(message = "검색어를 입력해주세요.")
    @Size(max = 100, message = "검색어는 100자 이하로 입력해주세요.")
    private String query;
}
