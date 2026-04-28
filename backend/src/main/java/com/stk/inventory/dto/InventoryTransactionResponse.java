package com.stk.inventory.dto;

import com.stk.inventory.entity.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class InventoryTransactionResponse {
    private Long id;
    private TransactionType transactionType;
    private MaterialDto material;
    private Integer quantity;
    private LocalDateTime transactionDate;
    private String businessUnit;
    private String manager;
    private UserDto managerUser;
    private String note;
    private String reference;
    private UserDto createdBy;
    private LocalDateTime createdAt;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
}
