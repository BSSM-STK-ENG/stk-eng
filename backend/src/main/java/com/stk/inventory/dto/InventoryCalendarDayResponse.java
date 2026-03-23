package com.stk.inventory.dto;

import java.time.LocalDate;

public record InventoryCalendarDayResponse(
        LocalDate date,
        int inboundQty,
        int outboundQty,
        int netQty,
        int inboundCount,
        int outboundCount,
        int transactionCount
) {
}
