package com.stk.inventory.dto;

import com.stk.inventory.entity.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TransactionResponse {
    private Long id;
    private TransactionType transactionType;
    private String materialCode;
    private Integer quantity;
    private LocalDateTime transactionDate;
    private String businessUnit;
    private String manager;
    private String note;
    private String reference;
    private UUID createdByUserId;
    private String createdByEmail;
    private boolean reverted;
    private boolean systemGenerated;
    private Long reversalOfTransactionId;
    private UUID revertedByUserId;
    private LocalDateTime revertedAt;
    private LocalDateTime createdAt;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
}
