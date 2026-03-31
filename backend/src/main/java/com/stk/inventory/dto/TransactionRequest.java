package com.stk.inventory.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TransactionRequest {
    private String materialCode;
    private Integer quantity;
    private LocalDateTime transactionDate;
    private String businessUnit;
    private String manager;
    private UUID managerUserId;
    private String note;
    private String reference;
}
