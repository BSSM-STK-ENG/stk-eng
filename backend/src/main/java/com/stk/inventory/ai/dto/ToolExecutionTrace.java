package com.stk.inventory.ai.dto;

import java.util.Map;

public record ToolExecutionTrace(
        String toolName,
        String status,
        String summary,
        Map<String, Object> input,
        Map<String, Object> output
) {
}
