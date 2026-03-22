package com.stk.inventory.ai.dto;

import java.time.LocalDateTime;

public record CredentialConnectionTestResponse(
        boolean success,
        String provider,
        String model,
        String message,
        LocalDateTime checkedAt
) {
}
