package com.stk.inventory.mapper;

import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.entity.MonthlyClosing;
import org.springframework.stereotype.Component;

@Component
public class MonthlyClosingMapper {

    public MonthlyClosingDto toDto(MonthlyClosing closing, boolean includeFinancials) {
        MonthlyClosingDto dto = new MonthlyClosingDto();
        dto.closingMonth = closing.getClosingMonth();
        dto.status = closing.getStatus();
        dto.closedAt = closing.getClosedAt();
        if (closing.getClosedBy() != null) {
            dto.closedByUserId = closing.getClosedBy().getId();
            dto.closedByEmail = closing.getClosedBy().getEmail();
        }
        dto.totalStockQty = closing.getTotalStockQty();
        dto.monthlyOutboundCount = closing.getMonthlyOutboundCount();
        dto.monthlyInboundQty = closing.getMonthlyInboundQty();
        dto.monthlyOutboundQty = closing.getMonthlyOutboundQty();
        dto.monthlySoldCount = closing.getMonthlyOutboundQty();
        if (includeFinancials) {
            dto.totalPurchaseAmount = closing.getTotalPurchaseAmount();
            dto.totalRevenueAmount = closing.getTotalRevenueAmount();
            dto.margin = closing.getMargin();
        }
        return dto;
    }
}
