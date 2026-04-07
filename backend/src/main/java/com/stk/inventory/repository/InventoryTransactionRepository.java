package com.stk.inventory.repository;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {
    List<InventoryTransaction> findByTransactionType(TransactionType transactionType);

    boolean existsByMaterialMaterialCode(String materialCode);

    List<InventoryTransaction> findAllByRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDescIdDesc();

    List<InventoryTransaction> findAllByOrderByTransactionDateDescIdDesc();

    List<InventoryTransaction> findByMaterialMaterialCodeInAndTransactionDateGreaterThanEqualOrderByTransactionDateDesc(
            Collection<String> materialCodes,
            LocalDateTime transactionDate
    );

    List<InventoryTransaction> findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
            LocalDateTime from,
            LocalDateTime to
    );

    Page<InventoryTransaction> findByRevertedFalseAndSystemGeneratedFalse(Pageable pageable);

    List<InventoryTransaction> findByTransactionDateGreaterThanEqualAndRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDesc(LocalDateTime from);
}
