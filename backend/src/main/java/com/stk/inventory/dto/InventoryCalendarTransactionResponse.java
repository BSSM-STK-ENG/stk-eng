package com.stk.inventory.dto;

import java.time.LocalDateTime;

public record InventoryCalendarTransactionResponse(
        Long id,
        String transactionType,
        String transactionLabel,
        String materialCode,
        String materialName,
        Integer quantity,
        LocalDateTime transactionDate,
        String businessUnit,
        String manager,
        String note,
        String reference,
        String createdByEmail
) {
}
