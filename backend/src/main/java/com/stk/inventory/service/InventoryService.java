package com.stk.inventory.service;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryTransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;

    public InventoryService(InventoryTransactionRepository transactionRepository,
                            MaterialRepository materialRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public InventoryTransaction processInbound(TransactionRequest request) {
        return processTransaction(request, TransactionType.IN);
    }

    @Transactional
    public InventoryTransaction processOutbound(TransactionRequest request) {
        return processTransaction(request, TransactionType.OUT);
    }

    private InventoryTransaction processTransaction(TransactionRequest request, TransactionType type) {
        Material material = materialRepository.findById(request.getMaterialCode())
                .orElseThrow(() -> new IllegalArgumentException("Material not found"));

        if (type == TransactionType.IN) {
            material.setCurrentStockQty(material.getCurrentStockQty() + request.getQuantity());
        } else if (type == TransactionType.OUT) {
            if (material.getCurrentStockQty() < request.getQuantity()) {
                throw new IllegalArgumentException("Not enough stock");
            }
            material.setCurrentStockQty(material.getCurrentStockQty() - request.getQuantity());
        }

        materialRepository.save(material);

        InventoryTransaction transaction = InventoryTransaction.builder()
                .transactionType(type)
                .material(material)
                .quantity(request.getQuantity())
                .transactionDate(request.getTransactionDate() != null ? request.getTransactionDate() : LocalDateTime.now())
                .businessUnit(request.getBusinessUnit())
                .manager(request.getManager())
                .note(request.getNote())
                .reference(request.getReference())
                .createdBy(getCurrentUser())
                .build();

        return transactionRepository.save(transaction);
    }

    public List<InventoryTransaction> getTransactions() {
        return transactionRepository.findAll();
    }

    @Transactional
    public void deleteTransaction(Long id) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        // Reverse stock impact
        Material material = tx.getMaterial();
        if (tx.getTransactionType() == TransactionType.IN) {
            material.setCurrentStockQty(Math.max(0, material.getCurrentStockQty() - tx.getQuantity()));
        } else if (tx.getTransactionType() == TransactionType.OUT) {
            material.setCurrentStockQty(material.getCurrentStockQty() + tx.getQuantity());
        }
        materialRepository.save(material);
        transactionRepository.delete(tx);
    }

    @Transactional
    public InventoryTransaction updateTransaction(Long id, TransactionRequest request) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        Material oldMaterial = tx.getMaterial();
        Material newMaterial = oldMaterial.getMaterialCode().equals(request.getMaterialCode()) 
                ? oldMaterial 
                : materialRepository.findById(request.getMaterialCode())
                        .orElseThrow(() -> new IllegalArgumentException("New Material not found"));

        // Reverse stock impact on old material
        if (tx.getTransactionType() == TransactionType.IN) {
            oldMaterial.setCurrentStockQty(Math.max(0, oldMaterial.getCurrentStockQty() - tx.getQuantity()));
        } else if (tx.getTransactionType() == TransactionType.OUT) {
            oldMaterial.setCurrentStockQty(oldMaterial.getCurrentStockQty() + tx.getQuantity());
        }

        if (!oldMaterial.getMaterialCode().equals(newMaterial.getMaterialCode())) {
            materialRepository.save(oldMaterial);
        }

        // Apply stock impact on new material
        if (tx.getTransactionType() == TransactionType.IN) {
            newMaterial.setCurrentStockQty(newMaterial.getCurrentStockQty() + request.getQuantity());
        } else if (tx.getTransactionType() == TransactionType.OUT) {
            if (newMaterial.getCurrentStockQty() < request.getQuantity()) {
                throw new IllegalArgumentException("Not enough stock for update");
            }
            newMaterial.setCurrentStockQty(newMaterial.getCurrentStockQty() - request.getQuantity());
        }
        materialRepository.save(newMaterial);

        tx.setMaterial(newMaterial);
        tx.setQuantity(request.getQuantity());
        if (request.getTransactionDate() != null) tx.setTransactionDate(request.getTransactionDate());
        tx.setBusinessUnit(request.getBusinessUnit());
        tx.setManager(request.getManager());
        tx.setNote(request.getNote());
        tx.setReference(request.getReference());

        return transactionRepository.save(tx);
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String email = ((UserDetails) principal).getUsername();
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}
