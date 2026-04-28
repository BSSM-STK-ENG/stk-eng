package com.stk.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TransactionRequest {
    @NotBlank(message = "자재코드를 입력해주세요.")
    private String materialCode;

    @NotNull(message = "수량을 입력해주세요.")
    @Positive(message = "수량은 1 이상이어야 합니다.")
    private Integer quantity;

    private LocalDateTime transactionDate;

    @NotBlank(message = "사업장을 입력해주세요.")
    private String businessUnit;

    private String manager;
    private UUID managerUserId;
    private String note;
    private String reference;

    @PositiveOrZero(message = "단가는 0 이상이어야 합니다.")
    private BigDecimal unitPrice;
}
