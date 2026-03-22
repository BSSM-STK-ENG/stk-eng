package com.stk.inventory.ai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class RelativeDateContextServiceTest {

    private final RelativeDateContextService relativeDateContextService = new RelativeDateContextService();

    @Test
    void buildsAsiaSeoulContext() {
        String context = relativeDateContextService.buildContextBlock();

        assertTrue(context.contains("Asia/Seoul"));
        assertTrue(context.contains("Today:"));
        assertTrue(context.contains("Yesterday:"));
    }
}
