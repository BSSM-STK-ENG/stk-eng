package com.stk.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminCreatePermissionPresetRequest {
    private String label;
    private String description;
    private List<String> pagePermissions;
}
