package com.stk.inventory.entity;

import java.util.Arrays;
import java.util.Set;

public enum PermissionPreset {
    VIEWER(
            "VIEWER",
            "조회 전용",
            "대시보드와 조회 화면만 사용합니다.",
            PagePermission.orderedSet(
                    PagePermission.DASHBOARD,
                    PagePermission.CURRENT_STOCK,
                    PagePermission.STOCK_LEDGER,
                    PagePermission.HISTORY
            )
    ),
    OPERATOR(
            "OPERATOR",
            "입출고 담당",
            "조회 화면과 입고, 출고를 함께 사용합니다.",
            PagePermission.orderedSet(
                    PagePermission.DASHBOARD,
                    PagePermission.CURRENT_STOCK,
                    PagePermission.STOCK_LEDGER,
                    PagePermission.HISTORY,
                    PagePermission.INBOUND,
                    PagePermission.OUTBOUND
            )
    ),
    MANAGER(
            "MANAGER",
            "운영 관리자",
            "입출고, 월마감, 사업장 관리까지 사용합니다.",
            PagePermission.orderedSet(
                    PagePermission.DASHBOARD,
                    PagePermission.CURRENT_STOCK,
                    PagePermission.STOCK_LEDGER,
                    PagePermission.HISTORY,
                    PagePermission.INBOUND,
                    PagePermission.OUTBOUND,
                    PagePermission.CLOSING,
                    PagePermission.MASTER_DATA
            )
    );

    private final String key;
    private final String label;
    private final String description;
    private final Set<PagePermission> permissions;

    PermissionPreset(String key, String label, String description, Set<PagePermission> permissions) {
        this.key = key;
        this.label = label;
        this.description = description;
        this.permissions = permissions;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    public Set<PagePermission> getPermissions() {
        return permissions;
    }

    public static PermissionPreset fromKey(String key) {
        return Arrays.stream(values())
                .filter(value -> value.key.equalsIgnoreCase(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 권한 프리셋입니다: " + key));
    }
}
