package com.stk.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {
    private int totalStockQty;
    private int totalMaterials;
    private int stableCount;
    private int lowCount;
    private int zeroCount;
    private int todayInboundQty;
    private int todayOutboundQty;
    private List<DayMetric> recentWeek;
    private List<TransactionResponse> recentTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DayMetric {
        private String date;
        private int inboundQty;
        private int outboundQty;
        private int count;
    }
}
