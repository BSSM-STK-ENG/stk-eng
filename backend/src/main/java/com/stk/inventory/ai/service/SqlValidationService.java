package com.stk.inventory.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class SqlValidationService {

    private static final Pattern KEYWORD_PATTERN = Pattern.compile("\\b(from|join)\\s+([a-zA-Z0-9_\\.]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern LINE_COMMENT_PATTERN = Pattern.compile("(?m)--.*$");
    private static final Pattern BLOCK_COMMENT_PATTERN = Pattern.compile("/\\*.*?\\*/", Pattern.DOTALL);
    private static final Pattern MARKDOWN_FENCE_PATTERN = Pattern.compile("(?is)^```(?:sql)?\\s*(.*?)\\s*```$");
    private static final Pattern CTE_NAME_PATTERN = Pattern.compile("(?i)(?:with|,)\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s+as\\s*\\(");
    private static final Pattern DANGEROUS_KEYWORD_PATTERN = Pattern.compile("\\b(insert|update|delete|alter|drop|truncate|grant|revoke|create|merge|call|copy)\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Set<String> DEFAULT_ALLOWED_SOURCES = Set.of(
            "inventory_transactions",
            "materials",
            "monthly_closing",
            "inventory_transaction_facts",
            "material_stock_snapshot",
            "monthly_closing_status"
    );

    private final int maxRows;
    private final Supplier<Set<String>> allowedSourcesSupplier;

    @Autowired
    public SqlValidationService(@Value("${app.ai.sql.max-rows:200}") int maxRows,
                                InventorySchemaService inventorySchemaService) {
        this(maxRows, inventorySchemaService::getQueryableRelationNames);
    }

    SqlValidationService(int maxRows) {
        this(maxRows, DEFAULT_ALLOWED_SOURCES);
    }

    SqlValidationService(int maxRows, Set<String> allowedSources) {
        this(maxRows, () -> allowedSources);
    }

    private SqlValidationService(int maxRows, Supplier<Set<String>> allowedSourcesSupplier) {
        this.maxRows = maxRows;
        this.allowedSourcesSupplier = allowedSourcesSupplier;
    }

    public String validateAndNormalize(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "SQL is required");
        }

        String normalized = unwrapMarkdownFence(sql.trim());
        normalized = stripSqlComments(normalized).trim();
        normalized = stripTrailingSemicolons(normalized);
        String lowered = normalized.toLowerCase(Locale.ROOT);

        if (!(lowered.startsWith("select ") || lowered.startsWith("with "))) {
            throw new ResponseStatusException(BAD_REQUEST, "Only SELECT queries are allowed");
        }

        if (normalized.contains(";")) {
            throw new ResponseStatusException(BAD_REQUEST, "Multiple SQL statements are not allowed");
        }

        if (DANGEROUS_KEYWORD_PATTERN.matcher(lowered).find()) {
            throw new ResponseStatusException(BAD_REQUEST, "Blocked SQL token detected");
        }

        Set<String> cteNames = extractCteNames(lowered);
        Set<String> allowedSources = resolveAllowedSources();
        Matcher matcher = KEYWORD_PATTERN.matcher(lowered);
        while (matcher.find()) {
            String source = normalizeSourceName(matcher.group(2));
            if (!allowedSources.contains(source) && !cteNames.contains(source)) {
                throw new ResponseStatusException(BAD_REQUEST, "Only inventory tables and views are allowed");
            }
        }

        if (!lowered.contains(" limit ")) {
            normalized = normalized + " LIMIT " + maxRows;
        }

        return normalized;
    }

    private String unwrapMarkdownFence(String sql) {
        Matcher matcher = MARKDOWN_FENCE_PATTERN.matcher(sql);
        if (matcher.matches()) {
            return matcher.group(1).trim();
        }
        return sql;
    }

    private String stripSqlComments(String sql) {
        String withoutBlockComments = BLOCK_COMMENT_PATTERN.matcher(sql).replaceAll(" ");
        return LINE_COMMENT_PATTERN.matcher(withoutBlockComments).replaceAll(" ");
    }

    private String stripTrailingSemicolons(String sql) {
        String normalized = sql;
        while (normalized.endsWith(";")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return normalized;
    }

    private Set<String> extractCteNames(String loweredSql) {
        Set<String> names = new LinkedHashSet<>();
        Matcher matcher = CTE_NAME_PATTERN.matcher(loweredSql);
        while (matcher.find()) {
            names.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        return names;
    }

    private Set<String> resolveAllowedSources() {
        Set<String> allowedSources = allowedSourcesSupplier.get();
        if (allowedSources == null || allowedSources.isEmpty()) {
            return DEFAULT_ALLOWED_SOURCES;
        }

        Set<String> normalized = new LinkedHashSet<>();
        for (String source : allowedSources) {
            normalized.add(normalizeSourceName(source));
        }
        return normalized;
    }

    private String normalizeSourceName(String source) {
        String normalized = source.replace("\"", "").toLowerCase(Locale.ROOT);
        if (normalized.startsWith("public.")) {
            normalized = normalized.substring("public.".length());
        }
        return normalized;
    }
}
