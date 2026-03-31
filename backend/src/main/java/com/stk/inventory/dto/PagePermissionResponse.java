package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PagePermissionResponse {
    String key;
    String label;
    String path;
}
