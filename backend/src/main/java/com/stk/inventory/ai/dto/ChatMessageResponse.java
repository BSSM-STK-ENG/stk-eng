package com.stk.inventory.ai.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID sessionId,
        String role,
        String content,
        List<ToolTraceResponse> toolTrace,
        LocalDateTime createdAt
) {
}
