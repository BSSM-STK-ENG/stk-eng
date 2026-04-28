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
        MonthlyClosing closing = closingRepository.findById(month)
                .orElse(MonthlyClosing.builder().closingMonth(month).build());

        // Calculate monthly stats
        YearMonth ym = YearMonth.parse(month);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.atEndOfMonth().atTime(23, 59, 59);

        List<InventoryTransaction> monthTx = transactionRepository
                .findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                        from, to.plusSeconds(1));

        int totalStockQty = materialRepository.findAll().stream()
                .mapToInt(m -> m.getCurrentStockQty() != null ? m.getCurrentStockQty() : 0)
                .sum();

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

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String email = ((UserDetails) principal).getUsername();
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}
