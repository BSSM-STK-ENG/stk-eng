package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminPermissionOptionsResponse {
    List<RoleProfileResponse> roleProfiles;
    List<PagePermissionResponse> pages;
    List<PermissionPresetResponse> presets;
}
