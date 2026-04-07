package com.stk.inventory.gateway;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;

import java.util.List;
import java.util.Optional;

public interface InventoryGateway {
    Optional<Material> findMaterialById(String materialCode);
    Material saveMaterial(Material material);
    InventoryTransaction saveTransaction(InventoryTransaction tx);
    Optional<InventoryTransaction> findTransactionById(Long id);
    List<InventoryTransaction> findLedgerTransactions();
    List<InventoryTransaction> findAllTransactions();
}
