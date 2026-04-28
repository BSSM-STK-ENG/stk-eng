package com.stk.inventory.mapper;

import com.stk.inventory.dto.TransactionResponse;
import com.stk.inventory.entity.InventoryTransaction;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(InventoryTransaction tx) {
        return TransactionResponse.builder()
                .id(tx.getId())
                .transactionType(tx.getTransactionType())
                .materialCode(tx.getMaterial() != null ? tx.getMaterial().getMaterialCode() : null)
                .quantity(tx.getQuantity())
                .transactionDate(tx.getTransactionDate())
                .businessUnit(tx.getBusinessUnit())
                .manager(tx.getManager())
                .note(tx.getNote())
                .reference(tx.getReference())
                .createdByUserId(tx.getCreatedBy() != null ? tx.getCreatedBy().getId() : null)
                .createdByEmail(tx.getCreatedBy() != null ? tx.getCreatedBy().getEmail() : null)
                .reverted(tx.isReverted())
                .systemGenerated(tx.isSystemGenerated())
                .reversalOfTransactionId(tx.getReversalOfTransactionId())
                .revertedByUserId(tx.getRevertedBy() != null ? tx.getRevertedBy().getId() : null)
                .revertedAt(tx.getRevertedAt())
                .createdAt(tx.getCreatedAt())
                .unitPrice(tx.getUnitPrice() != null ? tx.getUnitPrice() : BigDecimal.ZERO)
                .totalAmount(tx.getUnitPrice() != null && tx.getQuantity() != null
                    ? tx.getUnitPrice().multiply(BigDecimal.valueOf(tx.getQuantity()))
                    : BigDecimal.ZERO)
                .build();
    }
}
