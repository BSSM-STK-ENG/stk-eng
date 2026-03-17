package com.stk.inventory.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TransactionRequest {
    private String materialCode;
    private Integer quantity;
    private LocalDateTime transactionDate;
    private String businessUnit;
    private String manager;
    private String note;
    private String reference;
}
