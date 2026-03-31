package com.stk.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminUpdateUserPermissionsRequest {
    private String permissionPreset;
    private List<String> pagePermissions;
}
