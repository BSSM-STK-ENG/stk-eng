package com.stk.inventory.ai.dto;

import java.util.List;
import java.util.Map;

public record SqlQueryResult(
        String executedSql,
        List<String> columns,
        List<Map<String, Object>> rows,
        int rowCount
) {
}
