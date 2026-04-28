package com.stk.inventory.service;

import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class MonthlyClosingService {

    private final MonthlyClosingRepository closingRepository;
    private final UserRepository userRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;

    public MonthlyClosingService(MonthlyClosingRepository closingRepository,
                                  UserRepository userRepository,
                                  InventoryTransactionRepository transactionRepository,
                                  MaterialRepository materialRepository) {
        this.closingRepository = closingRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
    }

    public List<MonthlyClosing> getAllClosings() {
        return closingRepository.findAllByOrderByClosingMonthDesc();
    }

    @Transactional
    public MonthlyClosing closeMonth(String month) {
        YearMonth ym = parseClosingMonth(month);
        MonthlyClosing closing = closingRepository.findById(month)
                .orElse(MonthlyClosing.builder().closingMonth(month).build());
        if (closing.getStatus() == ClosingStatus.CLOSED) {
            return closing;
        }

        // Calculate monthly stats
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime toExclusive = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<InventoryTransaction> monthTx = transactionRepository
                .findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                        from, toExclusive);

        int totalStockQty = calculateTotalStockQtyAt(toExclusive);

        int monthlyInboundQty = 0;
        int monthlyOutboundQty = 0;
        int monthlyOutboundCount = 0;
        BigDecimal totalPurchase = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        for (InventoryTransaction tx : monthTx) {
            if (tx.isReverted() || tx.isSystemGenerated()) continue;
            BigDecimal price = tx.getUnitPrice() != null ? tx.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal amount = price.multiply(BigDecimal.valueOf(tx.getQuantity()));

            if (tx.getTransactionType() == TransactionType.IN || tx.getTransactionType() == TransactionType.RETURN) {
                monthlyInboundQty += tx.getQuantity();
                totalPurchase = totalPurchase.add(amount);
            } else if (tx.getTransactionType() == TransactionType.OUT || tx.getTransactionType() == TransactionType.EXCHANGE) {
                monthlyOutboundQty += tx.getQuantity();
                monthlyOutboundCount++;
                totalRevenue = totalRevenue.add(amount);
            }
        }

        closing.setStatus(ClosingStatus.CLOSED);
        closing.setClosedBy(getCurrentUser());
        closing.setClosedAt(LocalDateTime.now());
        closing.setTotalStockQty(totalStockQty);
        closing.setMonthlyInboundQty(monthlyInboundQty);
        closing.setMonthlyOutboundQty(monthlyOutboundQty);
        closing.setMonthlyOutboundCount(monthlyOutboundCount);
        closing.setTotalPurchaseAmount(totalPurchase);
        closing.setTotalRevenueAmount(totalRevenue);
        closing.setMargin(totalRevenue.subtract(totalPurchase));

        return closingRepository.save(closing);
    }

    @Transactional
    public MonthlyClosing uncloseMonth(String month) {
        parseClosingMonth(month);
        MonthlyClosing closing = closingRepository.findById(month)
                .orElseThrow(() -> new IllegalArgumentException("Month not found"));
        if (closingRepository.existsByStatusAndClosingMonthGreaterThan(ClosingStatus.CLOSED, month)) {
            throw new IllegalArgumentException("이후 월이 이미 마감되어 취소할 수 없습니다.");
        }
        closing.setStatus(ClosingStatus.UNCLOSED);
        closing.setClosedBy(null);
        closing.setClosedAt(null);
        closing.setTotalStockQty(null);
        closing.setMonthlyInboundQty(null);
        closing.setMonthlyOutboundQty(null);
        closing.setMonthlyOutboundCount(null);
        closing.setTotalPurchaseAmount(null);
        closing.setTotalRevenueAmount(null);
        closing.setMargin(null);
        return closingRepository.save(closing);
    }

    private YearMonth parseClosingMonth(String month) {
        if (month == null || month.isBlank()) {
            throw new IllegalArgumentException("마감월은 YYYY-MM 형식이어야 합니다.");
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("마감월은 YYYY-MM 형식이어야 합니다.");
        }
    }

    private int calculateTotalStockQtyAt(LocalDateTime exclusiveEnd) {
        int currentStockQty = materialRepository.findAll().stream()
                .mapToInt(material -> material.getCurrentStockQty() != null ? material.getCurrentStockQty() : 0)
                .sum();
        int stockDeltaAfterEnd = transactionRepository
                .findByTransactionDateGreaterThanEqualAndRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDesc(exclusiveEnd)
                .stream()
                .mapToInt(this::stockDelta)
                .sum();
        return currentStockQty - stockDeltaAfterEnd;
    }

    private int stockDelta(InventoryTransaction transaction) {
        int quantity = transaction.getQuantity() != null ? transaction.getQuantity() : 0;
        if (transaction.getTransactionType() == TransactionType.IN || transaction.getTransactionType() == TransactionType.RETURN) {
            return quantity;
        }
        if (transaction.getTransactionType() == TransactionType.OUT || transaction.getTransactionType() == TransactionType.EXCHANGE) {
            return -quantity;
        }
        return 0;
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
}
