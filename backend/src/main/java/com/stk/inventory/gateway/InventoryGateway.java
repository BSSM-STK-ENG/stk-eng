package com.stk.inventory.gateway;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

public interface InventoryGateway {
    Optional<Material> findMaterialById(String materialCode);
    Material saveMaterial(Material material);
    InventoryTransaction saveTransaction(InventoryTransaction tx);
    Optional<InventoryTransaction> findTransactionById(Long id);
    List<InventoryTransaction> findLedgerTransactions();
    List<InventoryTransaction> findAllTransactions();
    Page<InventoryTransaction> findTransactionsPaged(Specification<InventoryTransaction> spec, Pageable pageable);
}
