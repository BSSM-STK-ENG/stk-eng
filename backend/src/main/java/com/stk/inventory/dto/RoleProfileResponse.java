package com.stk.inventory.dto;

import com.stk.inventory.entity.Role;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RoleProfileResponse {
    String key;
    String label;
    String description;
    Role baseRole;
    boolean systemProfile;
}
