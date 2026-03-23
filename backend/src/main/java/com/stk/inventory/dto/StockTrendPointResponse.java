package com.stk.inventory.dto;

import java.time.LocalDate;

public record StockTrendPointResponse(
        LocalDate date,
        int stockQty,
        int inboundQty,
        int outboundQty
) {
}
