package com.stk.inventory.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserRoleConstraintMigrationTest {

    @Test
    void replacesLegacyRoleConstraintWhenSuperAdminIsMissing() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class)))
                .thenReturn(true)
                .thenReturn(false);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenReturn(List.of("users_role_check"));

        UserRoleConstraintMigration migration = new UserRoleConstraintMigration(jdbcTemplate);

        migration.run(new DefaultApplicationArguments(new String[]{}));

        verify(jdbcTemplate).execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS \"users_role_check\"");
        verify(jdbcTemplate).execute("""
                ALTER TABLE users
                ADD CONSTRAINT users_role_check
                CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'))
                """);
    }

    @Test
    void skipsConstraintUpdateWhenUsersTableIsMissing() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class))).thenReturn(false);

        UserRoleConstraintMigration migration = new UserRoleConstraintMigration(jdbcTemplate);

        migration.run(new DefaultApplicationArguments(new String[]{}));

        verify(jdbcTemplate, never()).query(anyString(), any(RowMapper.class));
        verify(jdbcTemplate, never()).execute(anyString());
    }
}
