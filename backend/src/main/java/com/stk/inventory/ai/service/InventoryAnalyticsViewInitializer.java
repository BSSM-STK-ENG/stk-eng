package com.stk.inventory.ai.service;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class InventoryAnalyticsViewInitializer {

    private final JdbcTemplate jdbcTemplate;

    public InventoryAnalyticsViewInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initializeViews() {
        jdbcTemplate.execute("""
                CREATE OR REPLACE VIEW inventory_transaction_facts AS
                SELECT
                    it.id AS transaction_id,
                    it.transaction_type,
                    it.transaction_date,
                    DATE(it.transaction_date) AS transaction_day,
                    m.material_code,
                    m.material_name,
                    m.location,
                    it.quantity,
                    it.business_unit,
                    it.manager,
                    it.note,
                    it.reference,
                    u.email AS created_by_email,
                    it.created_at
                FROM inventory_transactions it
                JOIN materials m ON m.material_code = it.material_code
                LEFT JOIN users u ON u.id = it.created_by_user_id
                """);

        jdbcTemplate.execute("""
                CREATE OR REPLACE VIEW material_stock_snapshot AS
                SELECT
                    material_code,
                    material_name,
                    location,
                    safe_stock_qty,
                    current_stock_qty
                FROM materials
                """);

        jdbcTemplate.execute("""
                CREATE OR REPLACE VIEW monthly_closing_status AS
                SELECT
                    mc.closing_month,
                    mc.status,
                    u.email AS closed_by_email,
                    mc.closed_at
                FROM monthly_closing mc
                LEFT JOIN users u ON u.id = mc.closed_by_user_id
                """);
    }
}
