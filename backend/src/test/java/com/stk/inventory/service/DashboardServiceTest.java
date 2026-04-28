package com.stk.inventory.service;

import com.stk.inventory.mapper.MonthlyClosingMapper;
import com.stk.inventory.mapper.TransactionMapper;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private MonthlyClosingRepository monthlyClosingRepository;

    @Mock
    private FinanceAccessService financeAccessService;

    @Mock
    private LowStockService lowStockService;

    @Test
    void getSummaryUsesExclusiveNextMonthStartForCurrentMonthFinancials() {
        DashboardService service = new DashboardService(
                materialRepository,
                transactionRepository,
                new TransactionMapper(),
                monthlyClosingRepository,
                financeAccessService,
                lowStockService,
                new MonthlyClosingMapper()
        );
        when(materialRepository.findAll()).thenReturn(List.of());
        when(transactionRepository.findByTransactionDateGreaterThanEqualAndRevertedFalseAndSystemGeneratedFalseOrderByTransactionDateDesc(
                any(LocalDateTime.class)
        )).thenReturn(List.of());
        when(transactionRepository.findByRevertedFalseAndSystemGeneratedFalse(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(transactionRepository.findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                any(LocalDateTime.class),
                any(LocalDateTime.class)
        )).thenReturn(List.of());
        when(monthlyClosingRepository.findAllByOrderByClosingMonthDesc()).thenReturn(List.of());
        when(financeAccessService.canViewFinancialSummaries()).thenReturn(false);

        service.getSummary();

        ArgumentCaptor<LocalDateTime> fromCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> toCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(transactionRepository).findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                fromCaptor.capture(),
                toCaptor.capture()
        );
        assertEquals(fromCaptor.getValue().toLocalDate().withDayOfMonth(1).atStartOfDay(), fromCaptor.getValue());
        assertEquals(fromCaptor.getValue().plusMonths(1), toCaptor.getValue());
    }
}
