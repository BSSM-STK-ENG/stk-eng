package com.stk.inventory.dto;

import java.time.LocalDate;
import java.util.List;

public record StockTrendResponse(
        LocalDate fromDate,
        LocalDate toDate,
        int totalDays,
        List<String> materialCodes,
        List<StockTrendSeriesResponse> series
) {
}
