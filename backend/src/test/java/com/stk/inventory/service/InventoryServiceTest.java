package com.stk.inventory.service;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.gateway.InventoryGateway;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.repository.UserRepository;
import com.stk.inventory.mapper.TransactionMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryGateway inventoryGateway;


    @Mock
    private UserRepository userRepository;

    @Mock
    private MasterDataService masterDataService;

    @Mock
    private UserDirectoryService userDirectoryService;

    @Mock
    private MonthlyClosingRepository monthlyClosingRepository;

    @Test
    void processInboundRequiresRegisteredBusinessUnit() {
        InventoryService service = new InventoryService(inventoryGateway, userRepository, masterDataService, userDirectoryService, new TransactionMapper());
        Material material = Material.builder()
                .materialCode("MAT-001")
                .materialName("테스트 자재")
                .currentStockQty(5)
                .safeStockQty(2)
                .build();
        TransactionRequest request = new TransactionRequest();
        request.setMaterialCode("MAT-001");
        request.setQuantity(3);
        request.setBusinessUnit("QA-T1");

        when(inventoryGateway.findMaterialById("MAT-001")).thenReturn(Optional.of(material));
        when(masterDataService.requireRegisteredBusinessUnit("QA-T1")).thenReturn("QA-T1");
        when(inventoryGateway.saveMaterial(any(Material.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryGateway.saveTransaction(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.stk.inventory.dto.TransactionResponse saved = service.processInbound(request);

        ArgumentCaptor<InventoryTransaction> captor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryGateway).saveTransaction(captor.capture());
        assertEquals("QA-T1", captor.getValue().getBusinessUnit());
        assertNull(captor.getValue().getManager());
        assertEquals(8, material.getCurrentStockQty());
    }

    @Test
    void processOutboundRejectsWhenStockIsInsufficient() {
        InventoryService service = new InventoryService(inventoryGateway, userRepository, masterDataService, userDirectoryService, new TransactionMapper());
        Material material = Material.builder()
                .materialCode("MAT-002")
                .materialName("출고 자재")
                .currentStockQty(2)
                .safeStockQty(0)
                .build();
        TransactionRequest request = new TransactionRequest();
        request.setMaterialCode("MAT-002");
        request.setQuantity(5);
        request.setBusinessUnit("QA-T1");
        request.setManager("Port QA");

        when(inventoryGateway.findMaterialById("MAT-002")).thenReturn(Optional.of(material));
        when(masterDataService.requireRegisteredBusinessUnit("QA-T1")).thenReturn("QA-T1");
        when(userDirectoryService.requireRegisteredManagerName("Port QA")).thenReturn("Port QA");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.processOutbound(request));
        assertEquals("현재 재고가 부족해 출고할 수 없습니다.", exception.getMessage());
    }

    @Test
    void updateInboundTransactionRecalculatesCurrentStock() {
        InventoryService service = new InventoryService(inventoryGateway, userRepository, masterDataService, userDirectoryService, new TransactionMapper());
        Material material = Material.builder()
                .materialCode("MAT-003")
                .materialName("입고 자재")
                .currentStockQty(15)
                .safeStockQty(3)
                .build();
        InventoryTransaction transaction = InventoryTransaction.builder()
                .id(10L)
                .transactionType(TransactionType.IN)
                .material(material)
                .quantity(5)
                .businessUnit("QA-T1")
                .build();
        TransactionRequest request = new TransactionRequest();
        request.setMaterialCode("MAT-003");
        request.setQuantity(8);
        request.setBusinessUnit("QA-T2");
        request.setNote("수정 메모");

        when(inventoryGateway.findTransactionById(10L)).thenReturn(Optional.of(transaction));
        when(masterDataService.requireRegisteredBusinessUnit("QA-T2")).thenReturn("QA-T2");
        when(inventoryGateway.saveMaterial(any(Material.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryGateway.saveTransaction(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.stk.inventory.dto.TransactionResponse updated = service.updateTransaction(10L, request);

        assertEquals(18, material.getCurrentStockQty());
        assertEquals(8, updated.getQuantity());
        assertEquals("QA-T2", updated.getBusinessUnit());
        assertEquals("수정 메모", updated.getNote());
    }

    @Test
    void processInboundRejectsNegativeUnitPriceBeforeChangingStock() {
        InventoryService service = new InventoryService(inventoryGateway, userRepository, masterDataService, userDirectoryService, new TransactionMapper());
        TransactionRequest request = new TransactionRequest();
        request.setMaterialCode("MAT-004");
        request.setQuantity(3);
        request.setBusinessUnit("QA-T1");
        request.setUnitPrice(BigDecimal.valueOf(-1));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.processInbound(request));

        assertEquals("단가는 0 이상이어야 합니다.", exception.getMessage());
        verifyNoInteractions(inventoryGateway);
    }

    @Test
    void processInboundRejectsWhenLaterMonthIsClosed() {
        InventoryService service = new InventoryService(
                inventoryGateway,
                userRepository,
                masterDataService,
                userDirectoryService,
                new TransactionMapper(),
                monthlyClosingRepository
        );
        TransactionRequest request = new TransactionRequest();
        request.setMaterialCode("MAT-005");
        request.setQuantity(1);
        request.setBusinessUnit("QA-T1");
        request.setTransactionDate(LocalDateTime.of(2026, 9, 15, 9, 0));

        when(monthlyClosingRepository.findById("2026-09")).thenReturn(Optional.empty());
        when(monthlyClosingRepository.existsByStatusAndClosingMonthGreaterThan(ClosingStatus.CLOSED, "2026-09")).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.processInbound(request));

        assertEquals("이후 마감월이 있어 2026-09 데이터는 수정할 수 없습니다.", exception.getMessage());
        verify(inventoryGateway, never()).findMaterialById(any());
    }
}
