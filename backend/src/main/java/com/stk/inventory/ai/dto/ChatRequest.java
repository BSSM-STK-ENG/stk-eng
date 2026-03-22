package com.stk.inventory.ai.dto;

import com.stk.inventory.ai.model.ProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ChatRequest(
        UUID sessionId,
        @NotNull(message = "provider is required")
        ProviderType provider,
        @NotBlank(message = "model is required")
        String model,
        @NotBlank(message = "message is required")
        String message,
        String contextMode
) {
}
