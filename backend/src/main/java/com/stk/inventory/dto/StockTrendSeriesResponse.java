package com.stk.inventory.dto;

import java.util.List;

public record StockTrendSeriesResponse(
        String materialCode,
        String materialName,
        String location,
        Integer safeStockQty,
        Integer currentStockQty,
        int startStockQty,
        int endStockQty,
        int changeQty,
        int minStockQty,
        int maxStockQty,
        List<StockTrendPointResponse> points
) {
}
