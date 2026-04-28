package com.stk.inventory.dto;

import com.stk.inventory.entity.ClosingStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class MonthlyClosingDto {
    public String closingMonth;
    public ClosingStatus status;
    public java.util.UUID closedByUserId;
    public String closedByEmail;
    public LocalDateTime closedAt;
    public Integer totalStockQty;
    public Integer monthlyOutboundCount;
    public Integer monthlyInboundQty;
    public Integer monthlyOutboundQty;
    public Integer monthlySoldCount;
    public BigDecimal totalPurchaseAmount;
    public BigDecimal totalRevenueAmount;
    public BigDecimal margin;
}
