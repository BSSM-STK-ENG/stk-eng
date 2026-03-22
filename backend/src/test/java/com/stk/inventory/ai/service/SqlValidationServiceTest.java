package com.stk.inventory.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SqlValidationServiceTest {

    private final SqlValidationService sqlValidationService = new SqlValidationService(200);

    @Test
    void allowsSelectOnAnalyticsViewAndAppendsLimit() {
        String sql = "SELECT material_code, SUM(quantity) AS total_qty FROM inventory_transaction_facts GROUP BY material_code ORDER BY total_qty DESC";

        String normalized = sqlValidationService.validateAndNormalize(sql);

        assertTrue(normalized.contains("LIMIT 200"));
    }

    @Test
    void allowsSelectOnBaseInventoryTable() {
        String normalized = sqlValidationService.validateAndNormalize(
                "SELECT material_code, material_name, current_stock_qty FROM materials ORDER BY material_code"
        );

        assertTrue(normalized.contains("FROM materials"));
        assertTrue(normalized.contains("LIMIT 200"));
    }

    @Test
    void allowsJoinAcrossInventoryTables() {
        String normalized = sqlValidationService.validateAndNormalize("""
                SELECT it.transaction_type, it.quantity, m.material_name
                FROM inventory_transactions it
                JOIN materials m ON m.material_code = it.material_code
                """);

        assertTrue(normalized.contains("FROM inventory_transactions"));
        assertTrue(normalized.contains("JOIN materials"));
        assertTrue(normalized.contains("LIMIT 200"));
    }

    @Test
    void stripsTrailingSemicolonFromSafeQuery() {
        String normalized = sqlValidationService.validateAndNormalize(
                "SELECT COALESCE(SUM(current_stock_qty), 0) AS total_stock FROM material_stock_snapshot;"
        );

        assertEquals(
                "SELECT COALESCE(SUM(current_stock_qty), 0) AS total_stock FROM material_stock_snapshot LIMIT 200",
                normalized
        );
    }

    @Test
    void allowsCteThatReadsFromAnalyticsView() {
        String normalized = sqlValidationService.validateAndNormalize("""
                WITH stock_totals AS (
                    SELECT SUM(current_stock_qty) AS total_stock
                    FROM material_stock_snapshot
                )
                SELECT total_stock
                FROM stock_totals
                """);

        assertTrue(normalized.contains("FROM stock_totals"));
        assertTrue(normalized.contains("LIMIT 200"));
    }

    @Test
    void stripsSqlCommentsFromSafeQuery() {
        String normalized = sqlValidationService.validateAndNormalize("""
                -- total stock
                SELECT SUM(current_stock_qty) AS total_stock
                FROM material_stock_snapshot
                """);

        assertTrue(normalized.startsWith("SELECT SUM(current_stock_qty)"));
        assertTrue(normalized.contains("LIMIT 200"));
    }

    @Test
    void unwrapsMarkdownFenceFromSafeQuery() {
        String normalized = sqlValidationService.validateAndNormalize("""
                ```sql
                SELECT COALESCE(SUM(current_stock_qty), 0) AS total_stock
                FROM material_stock_snapshot;
                ```
                """);

        assertEquals(
                "SELECT COALESCE(SUM(current_stock_qty), 0) AS total_stock\nFROM material_stock_snapshot LIMIT 200",
                normalized
        );
    }

    @Test
    void blocksDeleteStatements() {
        assertThrows(ResponseStatusException.class, () ->
                sqlValidationService.validateAndNormalize("DELETE FROM inventory_transaction_facts"));
    }

    @Test
    void blocksSensitiveSystemTableAccess() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
                sqlValidationService.validateAndNormalize("SELECT * FROM users"));

        assertEquals("Only inventory tables and views are allowed", exception.getReason());
    }

    @Test
    void blocksMultipleStatements() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
                sqlValidationService.validateAndNormalize("SELECT * FROM material_stock_snapshot; SELECT * FROM material_stock_snapshot"));

        assertEquals("Multiple SQL statements are not allowed", exception.getReason());
    }
}
