package com.stk.inventory.service;

import com.stk.inventory.dto.StockTrendResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class StockTrendServiceTest {

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Test
    void reconstructsDailyClosingStockWithinRange() {
        Material material = Material.builder()
                .materialCode("MAT-001")
                .materialName("알루미늄 코일")
                .location("A-01")
                .safeStockQty(80)
                .currentStockQty(140)
                .build();

        InventoryTransaction futureInbound = InventoryTransaction.builder()
                .id(3L)
                .material(material)
                .transactionType(TransactionType.IN)
                .quantity(30)
                .transactionDate(LocalDateTime.of(2026, 3, 24, 10, 0))
                .build();

        InventoryTransaction outbound = InventoryTransaction.builder()
                .id(2L)
                .material(material)
                .transactionType(TransactionType.OUT)
                .quantity(10)
                .transactionDate(LocalDateTime.of(2026, 3, 22, 14, 0))
                .build();

        InventoryTransaction inbound = InventoryTransaction.builder()
                .id(1L)
                .material(material)
                .transactionType(TransactionType.IN)
                .quantity(20)
                .transactionDate(LocalDateTime.of(2026, 3, 20, 9, 0))
                .build();

        when(materialRepository.findAllById(List.of("MAT-001"))).thenReturn(List.of(material));
        when(inventoryTransactionRepository.findByMaterialMaterialCodeInAndTransactionDateGreaterThanEqualOrderByTransactionDateDesc(
                eq(List.of("MAT-001")),
                any(LocalDateTime.class)
        )).thenReturn(List.of(futureInbound, outbound, inbound));

        StockTrendService service = new StockTrendService(materialRepository, inventoryTransactionRepository);
        StockTrendResponse response = service.getStockTrends(
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 23),
                List.of("MAT-001")
        );

        assertEquals(1, response.series().size());
        assertEquals(List.of("MAT-001"), response.materialCodes());
        assertEquals(120, response.series().get(0).points().get(0).stockQty());
        assertEquals(120, response.series().get(0).points().get(1).stockQty());
        assertEquals(110, response.series().get(0).points().get(2).stockQty());
        assertEquals(110, response.series().get(0).points().get(3).stockQty());
        assertEquals(20, response.series().get(0).points().get(0).inboundQty());
        assertEquals(10, response.series().get(0).points().get(2).outboundQty());
        assertEquals(120, response.series().get(0).startStockQty());
        assertEquals(110, response.series().get(0).endStockQty());
        assertEquals(-10, response.series().get(0).changeQty());
    }

    @Test
    void rejectsRangesLongerThanOneHundredEightyDays() {
        StockTrendService service = new StockTrendService(materialRepository, inventoryTransactionRepository);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.getStockTrends(
                        LocalDate.of(2025, 1, 1),
                        LocalDate.of(2025, 7, 31),
                        List.of()
                )
        );

        assertEquals(BAD_REQUEST, exception.getStatusCode());
    }
}
