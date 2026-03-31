package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MasterDataItemResponse {
    private Long id;
    private String name;
}
