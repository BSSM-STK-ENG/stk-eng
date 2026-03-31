package com.stk.inventory.entity;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

public enum PagePermission {
    DASHBOARD("DASHBOARD", "대시보드", "/dashboard"),
    CURRENT_STOCK("CURRENT_STOCK", "현재 재고", "/stock/current"),
    STOCK_LEDGER("STOCK_LEDGER", "재고 수불부", "/stock/ledger"),
    HISTORY("HISTORY", "변경 이력", "/history"),
    INBOUND("INBOUND", "입고 관리", "/inbound"),
    OUTBOUND("OUTBOUND", "출고 관리", "/outbound"),
    CLOSING("CLOSING", "월마감", "/closing"),
    MASTER_DATA("MASTER_DATA", "사업장 관리", "/master-data"),
    ADMIN_ACCOUNTS("ADMIN_ACCOUNTS", "사용자 관리", "/admin/accounts");

    private final String key;
    private final String label;
    private final String path;

    PagePermission(String key, String label, String path) {
        this.key = key;
        this.label = label;
        this.path = path;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public String getPath() {
        return path;
    }

    public String authority() {
        return "PAGE_" + key;
    }

    public static PagePermission fromKey(String key) {
        return Arrays.stream(values())
                .filter(value -> value.key.equalsIgnoreCase(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 페이지 권한입니다: " + key));
    }

    public static Set<PagePermission> orderedSet(PagePermission... permissions) {
        return new LinkedHashSet<>(Arrays.asList(permissions));
    }
}
