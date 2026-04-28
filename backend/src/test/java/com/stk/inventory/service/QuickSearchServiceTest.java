package com.stk.inventory.service;

import com.stk.inventory.dto.QuickSearchResult;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.mapper.MonthlyClosingMapper;
import com.stk.inventory.mapper.TransactionMapper;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuickSearchServiceTest {

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Mock
    private MonthlyClosingRepository monthlyClosingRepository;

    @Mock
    private FinanceAccessService financeAccessService;

    private QuickSearchService service;

    @BeforeEach
    void setUp() {
        service = new QuickSearchService(
                materialRepository,
                inventoryTransactionRepository,
                monthlyClosingRepository,
                new TransactionMapper(),
                new MonthlyClosingMapper(),
                financeAccessService
        );
    }

    @Test
    void searchReturnsFilteredMaterialsRecentTransactionsAndCurrentClosing() {
        Material alpha = Material.builder()
                .materialCode("MAT-001")
                .materialName("Alpha Bolt")
                .currentStockQty(10)
                .safeStockQty(3)
                .build();
        Material beta = Material.builder()
                .materialCode("BETA-002")
                .materialName("Washer")
                .currentStockQty(5)
                .safeStockQty(1)
                .build();

        InventoryTransaction transaction = InventoryTransaction.builder()
                .id(1L)
                .transactionType(TransactionType.OUT)
                .material(alpha)
                .quantity(2)
                .transactionDate(LocalDateTime.now())
                .businessUnit("QA")
                .unitPrice(BigDecimal.valueOf(1250))
                .build();

        String currentMonth = YearMonth.now().toString();
        MonthlyClosing closing = MonthlyClosing.builder()
                .closingMonth(currentMonth)
                .status(ClosingStatus.CLOSED)
                .monthlyInboundQty(7)
                .monthlyOutboundQty(4)
                .build();

        when(materialRepository.findAllByOrderByMaterialCodeAsc()).thenReturn(List.of(alpha, beta));
        when(inventoryTransactionRepository.findByRevertedFalseAndSystemGeneratedFalse(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(transaction)));
        when(monthlyClosingRepository.findById(currentMonth)).thenReturn(Optional.of(closing));
        when(financeAccessService.canViewFinancialSummaries()).thenReturn(true);

        QuickSearchResult result = service.search("alpha");

        assertEquals("alpha", result.getQuery());
        assertEquals(1, result.getMaterials().size());
        assertEquals("MAT-001", result.getMaterials().get(0).getMaterialCode());
        assertEquals(1, result.getRecentTransactions().size());
        assertEquals(TransactionType.OUT, result.getRecentTransactions().get(0).getTransactionType());
        assertEquals(BigDecimal.valueOf(1250), result.getRecentTransactions().get(0).getUnitPrice());
        assertEquals(currentMonth, result.getCurrentClosing().closingMonth);
        assertEquals(ClosingStatus.CLOSED, result.getCurrentClosing().status);
    }

    @Test
    void searchDefaultsCurrentClosingToUnclosedWhenMissing() {
        when(materialRepository.findAllByOrderByMaterialCodeAsc()).thenReturn(List.of());
        when(inventoryTransactionRepository.findByRevertedFalseAndSystemGeneratedFalse(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(monthlyClosingRepository.findById(any(String.class))).thenReturn(Optional.empty());
        when(financeAccessService.canViewFinancialSummaries()).thenReturn(false);

        QuickSearchResult result = service.search("   ");

        assertEquals(null, result.getQuery());
        assertTrue(result.getMaterials().isEmpty());
        assertEquals(ClosingStatus.UNCLOSED, result.getCurrentClosing().status);
        assertEquals(YearMonth.now().toString(), result.getCurrentClosing().closingMonth);
    }

    @Test
    void searchRedactsTransactionFinancialsWhenFinanceAccessIsNotAllowed() {
        InventoryTransaction transaction = InventoryTransaction.builder()
                .id(3L)
                .transactionType(TransactionType.IN)
                .material(Material.builder().materialCode("MAT-003").materialName("Gamma Nut").build())
                .quantity(4)
                .transactionDate(LocalDateTime.now())
                .businessUnit("OPS")
                .unitPrice(BigDecimal.valueOf(900))
                .build();

        when(materialRepository.findAllByOrderByMaterialCodeAsc()).thenReturn(List.of());
        when(inventoryTransactionRepository.findByRevertedFalseAndSystemGeneratedFalse(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(transaction)));
        when(monthlyClosingRepository.findById(any(String.class))).thenReturn(Optional.empty());
        when(financeAccessService.canViewFinancialSummaries()).thenReturn(false);

        QuickSearchResult result = service.search("nut");

        assertEquals(1, result.getRecentTransactions().size());
        assertNull(result.getRecentTransactions().get(0).getUnitPrice());
        assertNull(result.getRecentTransactions().get(0).getTotalAmount());
    }
}
