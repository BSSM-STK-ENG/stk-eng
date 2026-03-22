package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.SqlQueryResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Service
public class InventoryQueryService {

    private final DataSource dataSource;
    private final SqlValidationService sqlValidationService;
    private final int maxRows;

    public InventoryQueryService(JdbcTemplate jdbcTemplate,
                                 SqlValidationService sqlValidationService,
                                 @Value("${app.ai.sql.max-rows:200}") int maxRows) {
        this.dataSource = jdbcTemplate.getDataSource();
        this.sqlValidationService = sqlValidationService;
        this.maxRows = maxRows;
    }

    public SqlQueryResult runValidatedQuery(String sql) {
        String normalizedSql = sqlValidationService.validateAndNormalize(sql);

        try (Connection connection = Objects.requireNonNull(dataSource).getConnection();
             PreparedStatement statement = connection.prepareStatement(normalizedSql)) {
            statement.setMaxRows(maxRows);
            statement.setQueryTimeout(15);

            try (ResultSet resultSet = statement.executeQuery()) {
                ResultSetMetaData metaData = resultSet.getMetaData();
                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= metaData.getColumnCount(); i++) {
                    columns.add(metaData.getColumnLabel(i));
                }

                List<Map<String, Object>> rows = new ArrayList<>();
                while (resultSet.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String column : columns) {
                        Object value = resultSet.getObject(column);
                        if (value instanceof Timestamp timestamp) {
                            row.put(column, timestamp.toLocalDateTime().toString());
                        } else if (value instanceof java.sql.Date date) {
                            row.put(column, date.toString());
                        } else {
                            row.put(column, value);
                        }
                    }
                    rows.add(row);
                }

                return new SqlQueryResult(normalizedSql, columns, rows, rows.size());
            }
        } catch (SQLException ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Failed to query inventory DB", ex);
        }
    }
}
