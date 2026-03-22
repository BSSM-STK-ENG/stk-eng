package com.stk.inventory.ai.dto;

import com.stk.inventory.ai.model.ProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSessionRequest(
        @NotNull(message = "provider is required")
        ProviderType provider,
        @NotBlank(message = "model is required")
        String model,
        @NotBlank(message = "contextMode is required")
        String contextMode,
        String title
) {
}
