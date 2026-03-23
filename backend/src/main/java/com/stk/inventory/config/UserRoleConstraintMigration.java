package com.stk.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(0)
public class UserRoleConstraintMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserRoleConstraintMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public UserRoleConstraintMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!usersTableExists()) {
            return;
        }

        List<String> staleRoleConstraints = jdbcTemplate.query(
                """
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE rel.relname = 'users'
                  AND nsp.nspname = current_schema()
                  AND con.contype = 'c'
                  AND pg_get_constraintdef(con.oid) ILIKE '%role%'
                  AND pg_get_constraintdef(con.oid) NOT ILIKE '%SUPER_ADMIN%'
                """,
                (rs, rowNum) -> rs.getString("conname")
        );

        staleRoleConstraints.forEach(this::dropConstraint);

        if (!hasSupportedRoleConstraint()) {
            jdbcTemplate.execute("""
                    ALTER TABLE users
                    ADD CONSTRAINT users_role_check
                    CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'))
                    """);
            log.info("Ensured users.role check constraint supports SUPER_ADMIN");
        }
    }

    private boolean usersTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'users'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private boolean hasSupportedRoleConstraint() {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    WHERE rel.relname = 'users'
                      AND nsp.nspname = current_schema()
                      AND con.contype = 'c'
                      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
                      AND pg_get_constraintdef(con.oid) ILIKE '%SUPER_ADMIN%'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private void dropConstraint(String name) {
        String escapedName = "\"" + name.replace("\"", "\"\"") + "\"";
        jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS " + escapedName);
        log.info("Dropped stale users.role constraint: {}", name);
    }
}
