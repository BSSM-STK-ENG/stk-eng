package com.stk.inventory.ai.dto;

public record CredentialStatusResponse(
        String provider,
        boolean hasKey,
        String maskedKey,
        String status,
        java.time.LocalDateTime updatedAt,
        String validationStatus,
        String validationMessage,
        java.time.LocalDateTime validatedAt
) {
}
