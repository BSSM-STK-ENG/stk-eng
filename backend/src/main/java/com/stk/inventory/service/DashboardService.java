package com.stk.inventory.service;

import com.stk.inventory.dto.DashboardSummaryResponse;
import com.stk.inventory.dto.TransactionResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.mapper.TransactionMapper;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final MaterialRepository materialRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;

    public DashboardService(MaterialRepository materialRepository,
                           InventoryTransactionRepository transactionRepository,
                           TransactionMapper transactionMapper) {
        this.materialRepository = materialRepository;
        this.transactionRepository = transactionRepository;
        this.transactionMapper = transactionMapper;
    }

    public DashboardSummaryResponse getSummary() {
        List<Material> materials = materialRepository.findAll();

        int totalStockQty = materials.stream().mapToInt(m -> qty(m)).sum();
        int stableCount = (int) materials.stream().filter(m -> qty(m) > safe(m) && safe(m) > 0).count();
        int lowCount = (int) materials.stream().filter(m -> qty(m) > 0 && qty(m) <= safe(m) && safe(m) > 0).count();
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
        List<TransactionResponse> recent8 = transactionRepository
            .findByRevertedFalseAndSystemGeneratedFalse(
                PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "transactionDate", "id")))
            .getContent()
            .stream()
            .map(transactionMapper::toResponse)
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
