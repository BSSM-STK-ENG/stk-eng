package com.stk.inventory.service;

import com.stk.inventory.dto.DashboardSummaryResponse;
import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.dto.TransactionResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.mapper.MonthlyClosingMapper;
import com.stk.inventory.mapper.TransactionMapper;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final MaterialRepository materialRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final MonthlyClosingRepository monthlyClosingRepository;
    private final FinanceAccessService financeAccessService;
    private final LowStockService lowStockService;
    private final MonthlyClosingMapper monthlyClosingMapper;

    public DashboardService(MaterialRepository materialRepository,
                            InventoryTransactionRepository transactionRepository,
                            TransactionMapper transactionMapper,
                            MonthlyClosingRepository monthlyClosingRepository,
                            FinanceAccessService financeAccessService,
                            LowStockService lowStockService,
                            MonthlyClosingMapper monthlyClosingMapper) {
        this.materialRepository = materialRepository;
        this.transactionRepository = transactionRepository;
        this.transactionMapper = transactionMapper;
        this.monthlyClosingRepository = monthlyClosingRepository;
        this.financeAccessService = financeAccessService;
        this.lowStockService = lowStockService;
        this.monthlyClosingMapper = monthlyClosingMapper;
    }

    public DashboardSummaryResponse getSummary() {
        List<Material> materials = materialRepository.findAll();

        int totalStockQty = materials.stream().mapToInt(m -> qty(m)).sum();
        int stableCount = (int) materials.stream().filter(m -> qty(m) > safe(m) && safe(m) > 0).count();
        int lowCount = (int) materials.stream().filter(lowStockService::isLowStock).count();
        int zeroCount = (int) materials.stream().filter(m -> qty(m) <= 0).count();

        LocalDate today = LocalDate.now();
        LocalDateTime sevenDaysAgo = today.minusDays(6).atStartOfDay();
        List<InventoryTransaction> recentTx = transactionRepository
            .findByTransactionDateGreaterThanEqualAndRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDesc(sevenDaysAgo);

        // Group by day
        Map<String, DashboardSummaryResponse.DayMetric> dayMap = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            String key = today.minusDays(i).format(DateTimeFormatter.ISO_LOCAL_DATE);
            dayMap.put(key, DashboardSummaryResponse.DayMetric.builder().date(key).inboundQty(0).outboundQty(0).count(0).build());
        }
        for (InventoryTransaction tx : recentTx) {
            String key = tx.getTransactionDate().toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
            DashboardSummaryResponse.DayMetric metric = dayMap.get(key);
            if (metric == null) continue;
            metric.setCount(metric.getCount() + 1);
            if (isInbound(tx.getTransactionType())) {
                metric.setInboundQty(metric.getInboundQty() + tx.getQuantity());
            } else {
                metric.setOutboundQty(metric.getOutboundQty() + tx.getQuantity());
            }
        }

        String todayKey = today.format(DateTimeFormatter.ISO_LOCAL_DATE);
        DashboardSummaryResponse.DayMetric todayMetric = dayMap.getOrDefault(todayKey,
            DashboardSummaryResponse.DayMetric.builder().date(todayKey).build());

        // Recent 8 transactions
        boolean includeFinancials = financeAccessService.canViewFinancialSummaries();

        List<TransactionResponse> recent8 = transactionRepository
            .findByRevertedFalseAndSystemGeneratedFalse(
                PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "transactionDate", "id")))
            .getContent()
            .stream()
            .map(transactionMapper::toResponse)
            .map(response -> includeFinancials ? response : redactFinancials(response))
            .toList();

        // Current month financial
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime monthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = currentMonth.atEndOfMonth().atTime(23, 59, 59, 999999999);
        List<InventoryTransaction> monthTx = transactionRepository
            .findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                monthStart, monthEnd.plusSeconds(1));

        BigDecimal currentMonthRevenue = BigDecimal.ZERO;
        BigDecimal currentMonthPurchase = BigDecimal.ZERO;
        int currentMonthInQty = 0;
        int currentMonthOutQty = 0;

        for (InventoryTransaction tx : monthTx) {
            if (tx.isReverted() || tx.isSystemGenerated()) continue;
            BigDecimal price = tx.getUnitPrice() != null ? tx.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal amount = price.multiply(BigDecimal.valueOf(tx.getQuantity()));
            if (isInbound(tx.getTransactionType())) {
                currentMonthPurchase = currentMonthPurchase.add(amount);
                currentMonthInQty += tx.getQuantity();
            } else {
                currentMonthRevenue = currentMonthRevenue.add(amount);
                currentMonthOutQty += tx.getQuantity();
            }
        }
        BigDecimal currentMonthMargin = currentMonthRevenue.subtract(currentMonthPurchase);
        List<MonthlyClosingDto> recentClosings = monthlyClosingRepository.findAllByOrderByClosingMonthDesc().stream()
                .filter(closing -> closing.getStatus() == ClosingStatus.CLOSED)
                .limit(6)
                .map(closing -> monthlyClosingMapper.toDto(closing, includeFinancials))
                .toList();

        return DashboardSummaryResponse.builder()
            .totalStockQty(totalStockQty)
            .totalMaterials(materials.size())
            .stableCount(stableCount)
            .lowCount(lowCount)
            .zeroCount(zeroCount)
            .todayInboundQty(todayMetric.getInboundQty())
            .todayOutboundQty(todayMetric.getOutboundQty())
            .recentWeek(new ArrayList<>(dayMap.values()))
            .recentTransactions(recent8)
            .currentMonthRevenue(includeFinancials ? currentMonthRevenue : null)
            .currentMonthPurchase(includeFinancials ? currentMonthPurchase : null)
            .currentMonthMargin(includeFinancials ? currentMonthMargin : null)
            .currentMonthInboundQty(currentMonthInQty)
            .currentMonthOutboundQty(currentMonthOutQty)
            .recentClosings(recentClosings)
            .build();
    }

    private TransactionResponse redactFinancials(TransactionResponse response) {
        return TransactionResponse.builder()
                .id(response.getId())
                .transactionType(response.getTransactionType())
                .materialCode(response.getMaterialCode())
                .quantity(response.getQuantity())
                .transactionDate(response.getTransactionDate())
                .businessUnit(response.getBusinessUnit())
                .manager(response.getManager())
                .note(response.getNote())
                .reference(response.getReference())
                .createdByUserId(response.getCreatedByUserId())
                .createdByEmail(response.getCreatedByEmail())
                .reverted(response.isReverted())
                .systemGenerated(response.isSystemGenerated())
                .reversalOfTransactionId(response.getReversalOfTransactionId())
                .revertedByUserId(response.getRevertedByUserId())
                .revertedAt(response.getRevertedAt())
                .createdAt(response.getCreatedAt())
                .unitPrice(null)
                .totalAmount(null)
                .build();
    }

    private static int qty(Material m) {
        return m.getCurrentStockQty() != null ? m.getCurrentStockQty() : 0;
    }

    private static int safe(Material m) {
        return m.getSafeStockQty() != null ? m.getSafeStockQty() : 0;
    }

    private static boolean isInbound(TransactionType type) {
        return type == TransactionType.IN || type == TransactionType.RETURN;
    }
}
