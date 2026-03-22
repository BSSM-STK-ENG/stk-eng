package com.stk.inventory.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveCredentialRequest(
        @NotBlank(message = "apiKey is required")
        String apiKey,
        @NotBlank(message = "model is required")
        String model
) {
}
