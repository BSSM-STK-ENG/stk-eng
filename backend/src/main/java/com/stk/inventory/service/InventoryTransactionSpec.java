package com.stk.inventory.service;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.TransactionType;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDateTime;
import java.util.List;

public final class InventoryTransactionSpec {
    private InventoryTransactionSpec() {}

    public static Specification<InventoryTransaction> notReverted() {
        return (root, query, cb) -> cb.equal(root.get("reverted"), false);
    }

    public static Specification<InventoryTransaction> notSystemGenerated() {
        return (root, query, cb) -> cb.equal(root.get("systemGenerated"), false);
    }

    public static Specification<InventoryTransaction> hasType(TransactionType type) {
        return (root, query, cb) -> cb.equal(root.get("transactionType"), type);
    }

    public static Specification<InventoryTransaction> hasTypes(List<TransactionType> types) {
        return (root, query, cb) -> root.get("transactionType").in(types);
    }

    public static Specification<InventoryTransaction> dateFrom(LocalDateTime from) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("transactionDate"), from);
    }

    public static Specification<InventoryTransaction> dateTo(LocalDateTime to) {
        return (root, query, cb) -> cb.lessThan(root.get("transactionDate"), to);
    }

    public static Specification<InventoryTransaction> hasBusinessUnit(String unit) {
        return (root, query, cb) -> cb.equal(root.get("businessUnit"), unit);
    }

    public static Specification<InventoryTransaction> searchTerm(String q) {
        return (root, query, cb) -> {
            String pattern = "%" + q.toLowerCase() + "%";
            var material = root.join("material", JoinType.LEFT);
            return cb.or(
                cb.like(cb.lower(material.get("materialName")), pattern),
                cb.like(cb.lower(material.get("materialCode")), pattern),
                cb.like(cb.lower(root.get("manager")), pattern),
                cb.like(cb.lower(root.get("note")), pattern),
                cb.like(cb.lower(root.get("reference")), pattern),
                cb.like(cb.lower(root.get("businessUnit")), pattern)
            );
        };
    }
}
