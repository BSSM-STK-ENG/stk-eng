package com.stk.inventory.ai.dto;

import java.util.List;
import java.util.UUID;

public record ChatResponse(
        UUID sessionId,
        UUID messageId,
        ChatMessageResponse assistantMessage,
        List<ToolTraceResponse> toolTrace,
        String provider,
        String model,
        String title,
        String contextMode
) {
}
