package com.stk.inventory.dto;

import java.time.LocalDate;
import java.util.List;

public record InventoryCalendarResponse(
        String month,
        LocalDate monthStart,
        LocalDate monthEnd,
        int totalInboundQty,
        int totalOutboundQty,
        int activeDays,
        int transactionCount,
        List<InventoryCalendarDayResponse> days,
        List<InventoryCalendarTransactionResponse> transactions
) {
}
