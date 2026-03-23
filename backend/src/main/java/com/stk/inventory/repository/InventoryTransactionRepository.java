package com.stk.inventory.repository;

import com.stk.inventory.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {
    List<InventoryTransaction> findByMaterialMaterialCodeInAndTransactionDateGreaterThanEqualOrderByTransactionDateDesc(
            Collection<String> materialCodes,
            LocalDateTime transactionDate
    );

    List<InventoryTransaction> findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
            LocalDateTime from,
            LocalDateTime to
    );
}
