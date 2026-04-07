package com.stk.inventory.dto;

import com.stk.inventory.entity.ClosingStatus;

import java.time.LocalDateTime;

public class MonthlyClosingDto {
    public String closingMonth;
    public ClosingStatus status;
    public java.util.UUID closedByUserId;
    public String closedByEmail;
    public LocalDateTime closedAt;
}