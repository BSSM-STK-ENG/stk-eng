package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class PermissionPresetResponse {
    String key;
    String label;
    String description;
    boolean systemPreset;
    List<String> pagePermissions;
}
