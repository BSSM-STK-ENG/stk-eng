package com.stk.inventory.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class InventoryTransactionSchemaMigrationTest {

    @Test
    void addsMissingRevertedAndSystemGeneratedColumns() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class)))
                .thenReturn(true)
                .thenReturn(false)
                .thenReturn(false)
                .thenReturn(false);

        InventoryTransactionSchemaMigration migration = new InventoryTransactionSchemaMigration(jdbcTemplate);

        migration.run(new DefaultApplicationArguments(new String[]{}));

        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ADD COLUMN reverted boolean");
        verify(jdbcTemplate).execute("UPDATE inventory_transactions SET reverted = false WHERE reverted IS NULL");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN reverted SET DEFAULT false");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN reverted SET NOT NULL");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ADD COLUMN system_generated boolean");
        verify(jdbcTemplate).execute("UPDATE inventory_transactions SET system_generated = false WHERE system_generated IS NULL");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN system_generated SET DEFAULT false");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN system_generated SET NOT NULL");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ADD COLUMN unit_price numeric(19,2)");
        verify(jdbcTemplate).execute("UPDATE inventory_transactions SET unit_price = 0 WHERE unit_price IS NULL");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN unit_price SET DEFAULT 0");
        verify(jdbcTemplate).execute("ALTER TABLE inventory_transactions ALTER COLUMN unit_price SET NOT NULL");
    }

    @Test
    void skipsWhenInventoryTransactionsTableIsMissing() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class))).thenReturn(false);

        InventoryTransactionSchemaMigration migration = new InventoryTransactionSchemaMigration(jdbcTemplate);

        migration.run(new DefaultApplicationArguments(new String[]{}));

        verify(jdbcTemplate, never()).execute(anyString());
    }
}
