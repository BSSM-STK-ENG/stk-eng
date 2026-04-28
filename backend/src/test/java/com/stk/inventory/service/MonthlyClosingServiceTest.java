package com.stk.inventory.service;

import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyClosingServiceTest {

    @Mock
    private MonthlyClosingRepository closingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private MaterialRepository materialRepository;

    @Test
    void closeMonthReturnsExistingClosedRecordWithoutOverwritingAudit() {
        MonthlyClosingService service = new MonthlyClosingService(
                closingRepository,
                userRepository,
                transactionRepository,
                materialRepository
        );
        LocalDateTime closedAt = LocalDateTime.of(2026, 9, 30, 18, 0);
        MonthlyClosing closed = MonthlyClosing.builder()
                .closingMonth("2026-09")
                .status(ClosingStatus.CLOSED)
                .closedAt(closedAt)
                .totalStockQty(12)
                .build();

        when(closingRepository.findById("2026-09")).thenReturn(Optional.of(closed));

        MonthlyClosing result = service.closeMonth("2026-09");

        assertSame(closed, result);
        assertEquals(closedAt, result.getClosedAt());
        assertEquals(12, result.getTotalStockQty());
        verify(closingRepository, never()).save(any(MonthlyClosing.class));
        verifyNoInteractions(transactionRepository, materialRepository);
    }

    @Test
    void closeMonthCalculatesHistoricalStockFromTransactionsAfterMonthEnd() {
        MonthlyClosingService service = new MonthlyClosingService(
                closingRepository,
                userRepository,
                transactionRepository,
                materialRepository
        );
        LocalDateTime from = LocalDateTime.of(2026, 9, 1, 0, 0);
        LocalDateTime toExclusive = LocalDateTime.of(2026, 10, 1, 0, 0);
        InventoryTransaction inbound = transaction(TransactionType.IN, 5, BigDecimal.valueOf(5), LocalDateTime.of(2026, 9, 2, 9, 0));
        InventoryTransaction outbound = transaction(TransactionType.OUT, 3, BigDecimal.valueOf(10), LocalDateTime.of(2026, 9, 5, 9, 0));
        InventoryTransaction laterInbound = transaction(TransactionType.IN, 4, BigDecimal.ZERO, LocalDateTime.of(2026, 10, 2, 9, 0));
        InventoryTransaction laterOutbound = transaction(TransactionType.OUT, 2, BigDecimal.ZERO, LocalDateTime.of(2026, 10, 3, 9, 0));
        Material material = Material.builder()
                .materialCode("MAT-001")
                .materialName("테스트 자재")
                .currentStockQty(15)
                .build();

        when(closingRepository.findById("2026-09")).thenReturn(Optional.empty());
        when(transactionRepository.findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(from, toExclusive))
                .thenReturn(List.of(inbound, outbound));
        when(materialRepository.findAll()).thenReturn(List.of(material));
        when(transactionRepository.findByTransactionDateGreaterThanEqualAndRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDesc(toExclusive))
                .thenReturn(List.of(laterInbound, laterOutbound));
        when(closingRepository.save(any(MonthlyClosing.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonthlyClosing result = service.closeMonth("2026-09");

        ArgumentCaptor<MonthlyClosing> captor = ArgumentCaptor.forClass(MonthlyClosing.class);
        verify(closingRepository).save(captor.capture());
        assertSame(captor.getValue(), result);
        assertEquals(13, result.getTotalStockQty());
        assertEquals(5, result.getMonthlyInboundQty());
        assertEquals(3, result.getMonthlyOutboundQty());
        assertEquals(1, result.getMonthlyOutboundCount());
        assertEquals(BigDecimal.valueOf(25), result.getTotalPurchaseAmount());
        assertEquals(BigDecimal.valueOf(30), result.getTotalRevenueAmount());
    }

    @Test
    void uncloseMonthRejectsInvalidMonthFormatBeforeRepositoryLookup() {
        MonthlyClosingService service = new MonthlyClosingService(
                closingRepository,
                userRepository,
                transactionRepository,
                materialRepository
        );

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.uncloseMonth("2026/09"));

        assertEquals("마감월은 YYYY-MM 형식이어야 합니다.", exception.getMessage());
        verifyNoInteractions(closingRepository);
    }

    private InventoryTransaction transaction(TransactionType type, int quantity, BigDecimal unitPrice, LocalDateTime transactionDate) {
        return InventoryTransaction.builder()
                .transactionType(type)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .transactionDate(transactionDate)
                .build();
    }
}
