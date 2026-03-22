package com.stk.inventory.ai.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class InventorySchemaService {

    private static final String QUERYABLE_RELATIONS_SQL = """
            SELECT
                c.table_name,
                t.table_type,
                c.column_name,
                CASE
                    WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                    ELSE c.data_type
                END AS column_type
            FROM information_schema.columns c
            JOIN information_schema.tables t
              ON t.table_schema = c.table_schema
             AND t.table_name = c.table_name
            WHERE c.table_schema = 'public'
              AND c.table_name NOT IN ('users', 'provider_credentials', 'chat_messages', 'chat_sessions')
            ORDER BY
                CASE WHEN t.table_type = 'BASE TABLE' THEN 0 ELSE 1 END,
                c.table_name,
                c.ordinal_position
            """;

    private final JdbcTemplate jdbcTemplate;

    public InventorySchemaService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Set<String> getQueryableRelationNames() {
        return new LinkedHashSet<>(loadRelationDefinitions().keySet());
    }

    public String describeSchema() {
        Map<String, RelationDefinition> relations = loadRelationDefinitions();
        StringBuilder builder = new StringBuilder("Queryable inventory tables and views:\n");

        int index = 1;
        for (RelationDefinition relation : relations.values()) {
            builder.append(index++)
                    .append(". ")
                    .append(relation.name())
                    .append(" (")
                    .append(relation.typeLabel())
                    .append(")\n");

            for (ColumnDefinition column : relation.columns()) {
                builder.append("   - ")
                        .append(column.name())
                        .append(" ")
                        .append(column.type())
                        .append("\n");
            }

            builder.append("\n");
        }

        builder.append("""
                Rules:
                - Use only SELECT queries over the listed tables or views.
                - You may join the listed tables or views when needed.
                - Prefer grouped aggregates and small result sets.
                - Resolve relative dates in Asia/Seoul timezone.
                - Never modify data or use DDL.
                """);

        return builder.toString();
    }

    private Map<String, RelationDefinition> loadRelationDefinitions() {
        List<RelationColumnDefinition> rows = jdbcTemplate.query(
                QUERYABLE_RELATIONS_SQL,
                (resultSet, rowNum) -> new RelationColumnDefinition(
                        resultSet.getString("table_name"),
                        resultSet.getString("table_type"),
                        resultSet.getString("column_name"),
                        resultSet.getString("column_type")
                )
        );

        Map<String, RelationDefinition> relations = new LinkedHashMap<>();
        for (RelationColumnDefinition row : rows) {
            RelationDefinition relation = relations.computeIfAbsent(
                    row.relationName(),
                    key -> new RelationDefinition(row.relationName(), row.relationType(), new ArrayList<>())
            );
            relation.columns().add(new ColumnDefinition(row.columnName(), row.columnType()));
        }
        return relations;
    }

    private record RelationColumnDefinition(
            String relationName,
            String relationType,
            String columnName,
            String columnType
    ) {
    }

    private record ColumnDefinition(String name, String type) {
    }

    private record RelationDefinition(String name, String rawType, List<ColumnDefinition> columns) {
        private String typeLabel() {
            return "VIEW".equalsIgnoreCase(rawType) ? "view" : "table";
        }
    }
}
