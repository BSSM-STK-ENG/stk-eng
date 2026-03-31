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
    private final MasterDataService masterDataService;
    private final UserDirectoryService userDirectoryService;

    public InventoryService(InventoryTransactionRepository transactionRepository,
                            MaterialRepository materialRepository,
                            UserRepository userRepository,
                            MasterDataService masterDataService,
                            UserDirectoryService userDirectoryService) {
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
        this.masterDataService = masterDataService;
        this.userDirectoryService = userDirectoryService;
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
                .orElseThrow(() -> new IllegalArgumentException("등록된 자재만 선택할 수 있습니다."));

        String validatedBusinessUnit = masterDataService.requireRegisteredBusinessUnit(request.getBusinessUnit());
        String validatedManager = type == TransactionType.OUT
                ? resolveValidatedManager(request)
                : null;

        if (type == TransactionType.IN) {
            material.setCurrentStockQty(material.getCurrentStockQty() + request.getQuantity());
        } else if (type == TransactionType.OUT) {
            if (material.getCurrentStockQty() < request.getQuantity()) {
                throw new IllegalArgumentException("현재 재고가 부족해 출고할 수 없습니다.");
            }
            material.setCurrentStockQty(material.getCurrentStockQty() - request.getQuantity());
        }

        materialRepository.save(material);

        InventoryTransaction transaction = InventoryTransaction.builder()
                .transactionType(type)
                .material(material)
                .quantity(request.getQuantity())
                .transactionDate(request.getTransactionDate() != null ? request.getTransactionDate() : LocalDateTime.now())
                .businessUnit(validatedBusinessUnit)
                .manager(validatedManager)
                .note(request.getNote())
                .reference(request.getReference())
                .createdBy(getCurrentUser())
                .build();

        return transactionRepository.save(transaction);
    }

    public List<InventoryTransaction> getTransactions() {
        return transactionRepository.findAllByRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDescIdDesc();
    }

    public List<InventoryTransaction> getHistoryTransactions() {
        return transactionRepository.findAllByOrderByTransactionDateDescIdDesc();
    }

    @Transactional
    public void revertTransaction(Long id) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다."));

        if (tx.isSystemGenerated()) {
            throw new IllegalArgumentException("자동 생성된 되돌리기 내역은 다시 되돌릴 수 없습니다.");
        }
        if (tx.isReverted()) {
            throw new IllegalArgumentException("이미 되돌린 거래입니다.");
        }

        Material material = tx.getMaterial();
        int currentStock = material.getCurrentStockQty() == null ? 0 : material.getCurrentStockQty();
        TransactionType reversalType;

        if (tx.getTransactionType() == TransactionType.IN) {
            if (currentStock < tx.getQuantity()) {
                throw new IllegalArgumentException("이후 거래에서 이미 사용된 수량이 있어 되돌릴 수 없습니다.");
            }
            material.setCurrentStockQty(currentStock - tx.getQuantity());
            reversalType = TransactionType.OUT;
        } else if (tx.getTransactionType() == TransactionType.OUT) {
            material.setCurrentStockQty(currentStock + tx.getQuantity());
            reversalType = TransactionType.IN;
        } else {
            throw new IllegalArgumentException("이 거래는 되돌릴 수 없습니다.");
        }

        materialRepository.save(material);

        User currentUser = getCurrentUser();
        LocalDateTime revertedAt = LocalDateTime.now();

        tx.setReverted(true);
        tx.setRevertedAt(revertedAt);
        tx.setRevertedBy(currentUser);
        transactionRepository.save(tx);

        InventoryTransaction reversalTransaction = InventoryTransaction.builder()
                .transactionType(reversalType)
                .material(material)
                .quantity(tx.getQuantity())
                .transactionDate(revertedAt)
                .businessUnit(tx.getBusinessUnit())
                .manager(tx.getManager())
                .note(buildReversalNote(tx))
                .reference(tx.getReference())
                .createdBy(currentUser)
                .systemGenerated(true)
                .reversalOfTransactionId(tx.getId())
                .build();
        transactionRepository.save(reversalTransaction);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        throw new IllegalArgumentException("삭제 대신 되돌리기를 사용해주세요.");
    }

    @Transactional
    public InventoryTransaction updateTransaction(Long id, TransactionRequest request) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다."));

        Material oldMaterial = tx.getMaterial();
        Material newMaterial = oldMaterial.getMaterialCode().equals(request.getMaterialCode()) 
                ? oldMaterial 
                : materialRepository.findById(request.getMaterialCode())
                        .orElseThrow(() -> new IllegalArgumentException("변경할 자재를 찾을 수 없습니다."));

        String validatedBusinessUnit = masterDataService.requireRegisteredBusinessUnit(request.getBusinessUnit());
        String validatedManager = tx.getTransactionType() == TransactionType.OUT
                ? resolveValidatedManager(request)
                : null;

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
                throw new IllegalArgumentException("현재 재고가 부족해 수정할 수 없습니다.");
            }
            newMaterial.setCurrentStockQty(newMaterial.getCurrentStockQty() - request.getQuantity());
        }
        materialRepository.save(newMaterial);

        tx.setMaterial(newMaterial);
        tx.setQuantity(request.getQuantity());
        if (request.getTransactionDate() != null) tx.setTransactionDate(request.getTransactionDate());
        tx.setBusinessUnit(validatedBusinessUnit);
        tx.setManager(validatedManager);
        tx.setNote(request.getNote());
        tx.setReference(request.getReference());

        return transactionRepository.save(tx);
    }

    private User getCurrentUser() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            return null;
        }
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String email = ((UserDetails) principal).getUsername();
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }

    private String resolveValidatedManager(TransactionRequest request) {
        if (request.getManagerUserId() != null) {
            return userDirectoryService.requireRegisteredManagerNameByUserId(request.getManagerUserId());
        }
        return userDirectoryService.requireRegisteredManagerName(request.getManager());
    }

    private String buildReversalNote(InventoryTransaction transaction) {
        String originalType = transaction.getTransactionType() == TransactionType.IN ? "입고" : "출고";
        String originalNote = transaction.getNote() == null || transaction.getNote().isBlank() ? "" : " · " + transaction.getNote();
        return "되돌리기 처리 · 원거래 #" + transaction.getId() + " " + originalType + originalNote;
    }
}
