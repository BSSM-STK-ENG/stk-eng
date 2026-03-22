package com.stk.inventory.ai.dto;

import java.util.Map;

public record ToolTraceResponse(
        String kind,
        String title,
        String summary,
        String sql,
        java.util.List<String> sourceViews,
        Integer rowCount,
        Map<String, Object> input,
        Map<String, Object> output
) {
}
