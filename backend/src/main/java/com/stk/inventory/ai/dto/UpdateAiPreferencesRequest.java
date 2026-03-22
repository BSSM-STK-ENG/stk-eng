package com.stk.inventory.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAiPreferencesRequest(
        @NotBlank(message = "provider is required")
        String provider,
        @NotBlank(message = "model is required")
        String model
) {
}
