package com.stk.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class InventoryTransactionSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InventoryTransactionSchemaMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public InventoryTransactionSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!inventoryTransactionsTableExists()) {
            return;
        }

        ensureBooleanColumn("reverted");
        ensureBooleanColumn("system_generated");
    }

    private boolean inventoryTransactionsTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'inventory_transactions'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private void ensureBooleanColumn(String columnName) {
        if (hasColumn(columnName)) {
            return;
        }

        jdbcTemplate.execute("ALTER TABLE inventory_transactions ADD COLUMN " + columnName + " boolean");
        jdbcTemplate.execute("UPDATE inventory_transactions SET " + columnName + " = false WHERE " + columnName + " IS NULL");
        jdbcTemplate.execute("ALTER TABLE inventory_transactions ALTER COLUMN " + columnName + " SET DEFAULT false");
        jdbcTemplate.execute("ALTER TABLE inventory_transactions ALTER COLUMN " + columnName + " SET NOT NULL");
        log.info("Ensured inventory_transactions.{} column exists with false default", columnName);
    }

    private boolean hasColumn(String columnName) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'inventory_transactions'
                      AND column_name = ?
                )
                """,
                Boolean.class,
                columnName
        );
        return Boolean.TRUE.equals(exists);
    }
}
