package com.stk.inventory.ai.dto;

public record AiPreferencesResponse(
        String provider,
        String model,
        boolean chatPanelEnabled
) {
}
