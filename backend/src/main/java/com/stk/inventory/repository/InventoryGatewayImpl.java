package com.stk.inventory.repository;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.gateway.InventoryGateway;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class InventoryGatewayImpl implements InventoryGateway {

    private final InventoryTransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;

    public InventoryGatewayImpl(InventoryTransactionRepository transactionRepository, MaterialRepository materialRepository) {
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
    }

    @Override
    public Optional<Material> findMaterialById(String materialCode) {
        return materialRepository.findById(materialCode);
    }

    @Override
    public Material saveMaterial(Material material) {
        return materialRepository.save(material);
    }

    @Override
    public InventoryTransaction saveTransaction(InventoryTransaction tx) {
        return transactionRepository.save(tx);
    }

    @Override
    public Optional<InventoryTransaction> findTransactionById(Long id) {
        return transactionRepository.findById(id);
    }

    @Override
    public List<InventoryTransaction> findLedgerTransactions() {
        return transactionRepository.findAllByRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDescIdDesc();
    }

    @Override
    public List<InventoryTransaction> findAllTransactions() {
        return transactionRepository.findAllByOrderByTransactionDateDescIdDesc();
    }
}
