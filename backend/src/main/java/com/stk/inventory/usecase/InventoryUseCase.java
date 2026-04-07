package com.stk.inventory.usecase;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.dto.TransactionResponse;

import java.util.List;

public interface InventoryUseCase {
    TransactionResponse processInbound(TransactionRequest request);
    TransactionResponse processOutbound(TransactionRequest request);
    List<TransactionResponse> getLedger();
    List<TransactionResponse> getHistory();
    void revertTransaction(Long id);
    void deleteTransaction(Long id);
    TransactionResponse updateTransaction(Long id, TransactionRequest request);
}
