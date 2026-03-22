package com.stk.inventory.ai.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatSessionResponse(
        UUID id,
        String provider,
        String model,
        String contextMode,
        String title,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
