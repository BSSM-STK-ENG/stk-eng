package com.stk.inventory.service;

import com.stk.inventory.dto.StockTrendPointResponse;
import com.stk.inventory.dto.StockTrendResponse;
import com.stk.inventory.dto.StockTrendSeriesResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class StockTrendService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Seoul");
    private static final int DEFAULT_RANGE_DAYS = 30;
    private static final int MAX_RANGE_DAYS = 180;
    private static final int DEFAULT_MATERIAL_COUNT = 4;

    private final MaterialRepository materialRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public StockTrendService(MaterialRepository materialRepository,
                             InventoryTransactionRepository inventoryTransactionRepository) {
        this.materialRepository = materialRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    public StockTrendResponse getStockTrends(LocalDate fromDate,
                                            LocalDate toDate,
                                            Collection<String> requestedMaterialCodes) {
        LocalDate today = LocalDate.now(APP_ZONE);
        LocalDate normalizedTo = toDate == null ? today : (toDate.isAfter(today) ? today : toDate);
        LocalDate normalizedFrom = fromDate == null ? normalizedTo.minusDays(DEFAULT_RANGE_DAYS - 1L) : fromDate;

        validateRange(normalizedFrom, normalizedTo);

        List<Material> selectedMaterials = selectMaterials(requestedMaterialCodes);
        if (selectedMaterials.isEmpty()) {
            return new StockTrendResponse(
                    normalizedFrom,
                    normalizedTo,
                    (int) ChronoUnit.DAYS.between(normalizedFrom, normalizedTo) + 1,
                    List.of(),
                    List.of()
            );
        }

        List<String> materialCodes = selectedMaterials.stream()
                .map(Material::getMaterialCode)
                .toList();

        List<InventoryTransaction> transactions = inventoryTransactionRepository
                .findByMaterialMaterialCodeInAndTransactionDateGreaterThanEqualOrderByTransactionDateDesc(
                        materialCodes,
                        normalizedFrom.atStartOfDay()
                );

        Map<String, List<InventoryTransaction>> transactionsByMaterial = transactions.stream()
                .collect(Collectors.groupingBy(
                        transaction -> transaction.getMaterial().getMaterialCode(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<StockTrendSeriesResponse> series = selectedMaterials.stream()
                .map(material -> buildSeries(
                        material,
                        transactionsByMaterial.getOrDefault(material.getMaterialCode(), List.of()),
                        normalizedFrom,
                        normalizedTo
                ))
                .toList();

        return new StockTrendResponse(
                normalizedFrom,
                normalizedTo,
                (int) ChronoUnit.DAYS.between(normalizedFrom, normalizedTo) + 1,
                materialCodes,
                series
        );
    }

    private void validateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(BAD_REQUEST, "조회 시작일이 종료일보다 늦을 수 없습니다.");
        }

        long totalDays = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        if (totalDays > MAX_RANGE_DAYS) {
            throw new ResponseStatusException(BAD_REQUEST, "그래프 조회 기간은 최대 180일입니다.");
        }
    }

    private List<Material> selectMaterials(Collection<String> requestedMaterialCodes) {
        List<String> normalizedCodes = requestedMaterialCodes == null
                ? List.of()
                : requestedMaterialCodes.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(code -> !code.isBlank())
                        .distinct()
                        .toList();

        if (!normalizedCodes.isEmpty()) {
            Map<String, Material> materialMap = materialRepository.findAllById(normalizedCodes).stream()
                    .collect(Collectors.toMap(Material::getMaterialCode, material -> material));

            return normalizedCodes.stream()
                    .map(materialMap::get)
                    .filter(Objects::nonNull)
                    .toList();
        }

        List<Material> preferredMaterials = materialRepository.findAll().stream()
                .filter(this::isEligibleDefaultMaterial)
                .sorted(
                        Comparator.comparingInt((Material material) -> nullSafe(material.getCurrentStockQty())).reversed()
                                .thenComparing(Material::getMaterialName, String.CASE_INSENSITIVE_ORDER)
                                .thenComparing(Material::getMaterialCode)
                )
                .limit(DEFAULT_MATERIAL_COUNT)
                .toList();

        if (!preferredMaterials.isEmpty()) {
            return preferredMaterials;
        }

        return materialRepository.findAll().stream()
                .sorted(
                        Comparator.comparingInt((Material material) -> nullSafe(material.getCurrentStockQty())).reversed()
                                .thenComparing(Material::getMaterialName, String.CASE_INSENSITIVE_ORDER)
                                .thenComparing(Material::getMaterialCode)
                )
                .limit(DEFAULT_MATERIAL_COUNT)
                .toList();
    }

    private StockTrendSeriesResponse buildSeries(Material material,
                                                 List<InventoryTransaction> transactions,
                                                 LocalDate fromDate,
                                                 LocalDate toDate) {
        int runningStock = nullSafe(material.getCurrentStockQty());
        LocalDateTime rangeEndExclusive = toDate.plusDays(1).atStartOfDay();

        Map<LocalDate, Integer> dailyNetEffect = new HashMap<>();
        Map<LocalDate, Integer> dailyInbound = new HashMap<>();
        Map<LocalDate, Integer> dailyOutbound = new HashMap<>();

        for (InventoryTransaction transaction : transactions) {
            int effect = stockEffect(transaction);
            LocalDateTime transactionDate = transaction.getTransactionDate();
            LocalDate transactionDay = transactionDate.toLocalDate();

            if (!transactionDate.isBefore(rangeEndExclusive)) {
                runningStock -= effect;
                continue;
            }

            dailyNetEffect.merge(transactionDay, effect, Integer::sum);
            if (effect > 0) {
                dailyInbound.merge(transactionDay, transaction.getQuantity(), Integer::sum);
            } else if (effect < 0) {
                dailyOutbound.merge(transactionDay, transaction.getQuantity(), Integer::sum);
            }
        }

        List<StockTrendPointResponse> reversePoints = new ArrayList<>();
        int minStock = Integer.MAX_VALUE;
        int maxStock = Integer.MIN_VALUE;

        for (LocalDate cursor = toDate; !cursor.isBefore(fromDate); cursor = cursor.minusDays(1)) {
            int stockQty = runningStock;
            reversePoints.add(new StockTrendPointResponse(
                    cursor,
                    stockQty,
                    dailyInbound.getOrDefault(cursor, 0),
                    dailyOutbound.getOrDefault(cursor, 0)
            ));
            minStock = Math.min(minStock, stockQty);
            maxStock = Math.max(maxStock, stockQty);
            runningStock -= dailyNetEffect.getOrDefault(cursor, 0);
        }

        Collections.reverse(reversePoints);

        int startStockQty = reversePoints.isEmpty() ? 0 : reversePoints.get(0).stockQty();
        int endStockQty = reversePoints.isEmpty() ? 0 : reversePoints.get(reversePoints.size() - 1).stockQty();

        return new StockTrendSeriesResponse(
                material.getMaterialCode(),
                material.getMaterialName(),
                material.getLocation(),
                material.getSafeStockQty(),
                material.getCurrentStockQty(),
                startStockQty,
                endStockQty,
                endStockQty - startStockQty,
                minStock == Integer.MAX_VALUE ? 0 : minStock,
                maxStock == Integer.MIN_VALUE ? 0 : maxStock,
                reversePoints
        );
    }

    private int stockEffect(InventoryTransaction transaction) {
        TransactionType transactionType = transaction.getTransactionType();
        return switch (transactionType) {
            case IN, RETURN -> transaction.getQuantity();
            case OUT -> -transaction.getQuantity();
            case EXCHANGE -> 0;
        };
    }

    private boolean isEligibleDefaultMaterial(Material material) {
        return isMeaningfulValue(material.getMaterialCode()) && isMeaningfulValue(material.getMaterialName());
    }

    private boolean isMeaningfulValue(String value) {
        return value != null && !value.isBlank() && !"nan".equalsIgnoreCase(value.trim());
    }

    private int nullSafe(Integer value) {
        return value == null ? 0 : value;
    }
}
