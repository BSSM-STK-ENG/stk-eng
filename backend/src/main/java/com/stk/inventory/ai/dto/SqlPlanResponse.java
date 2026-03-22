package com.stk.inventory.ai.dto;

public record SqlPlanResponse(
        String sql,
        String intent,
        String title
) {
}
