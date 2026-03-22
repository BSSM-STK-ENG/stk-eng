package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.SqlQueryResult;
import com.stk.inventory.ai.dto.ToolExecutionTrace;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class InventoryToolRegistryService {

    private final InventorySchemaService inventorySchemaService;
    private final InventoryQueryService inventoryQueryService;

    public InventoryToolRegistryService(InventorySchemaService inventorySchemaService,
                                        InventoryQueryService inventoryQueryService) {
        this.inventorySchemaService = inventorySchemaService;
        this.inventoryQueryService = inventoryQueryService;
    }

    public ToolExecutionTrace describeSchema() {
        String schema = inventorySchemaService.describeSchema();
        return new ToolExecutionTrace(
                "inventory_schema_describe",
                "success",
                "Queryable inventory schema described",
                Map.of(),
                Map.of("schema", schema)
        );
    }

    public ToolExecutionTrace runSqlQuery(String sql) {
        SqlQueryResult result = inventoryQueryService.runValidatedQuery(sql);
        return new ToolExecutionTrace(
                "inventory_sql_query",
                "success",
                "Executed inventory read-only query",
                Map.of("sql", sql),
                Map.of(
                        "executedSql", result.executedSql(),
                        "columns", result.columns(),
                        "rowCount", result.rowCount(),
                        "rows", result.rows()
                )
        );
    }

    public ToolExecutionTrace formatAnswer(String question, ToolExecutionTrace sqlTrace) {
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("question", question);
        output.put("sqlSummary", sqlTrace.output());
        output.put("instruction", "Use the SQL result as the only factual basis. Mention absolute dates for relative-date questions.");
        return new ToolExecutionTrace(
                "inventory_answer_formatter",
                "success",
                "Prepared structured evidence for the final answer",
                Map.of("question", question),
                output
        );
    }
}
