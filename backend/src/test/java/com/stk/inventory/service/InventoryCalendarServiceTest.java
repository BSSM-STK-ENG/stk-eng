package com.stk.inventory.service;

import com.stk.inventory.dto.InventoryCalendarResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.InventoryTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class InventoryCalendarServiceTest {

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Test
    void aggregatesMonthByDayAndKeepsTransactionDetails() {
        Material material = Material.builder()
                .materialCode("MAT-001")
                .materialName("알루미늄 코일")
                .build();

        User user = User.builder()
                .email("planner@stk.local")
                .build();

        InventoryTransaction inbound = InventoryTransaction.builder()
                .id(1L)
                .material(material)
                .transactionType(TransactionType.IN)
                .quantity(30)
                .transactionDate(LocalDateTime.of(2026, 3, 5, 9, 30))
                .createdBy(user)
                .build();

        InventoryTransaction outbound = InventoryTransaction.builder()
                .id(2L)
                .material(material)
                .transactionType(TransactionType.OUT)
                .quantity(10)
                .transactionDate(LocalDateTime.of(2026, 3, 5, 14, 15))
                .createdBy(user)
                .build();

        InventoryTransaction returned = InventoryTransaction.builder()
                .id(3L)
                .material(material)
                .transactionType(TransactionType.RETURN)
                .quantity(4)
                .transactionDate(LocalDateTime.of(2026, 3, 6, 11, 0))
                .createdBy(user)
                .build();

        InventoryTransaction exchanged = InventoryTransaction.builder()
                .id(4L)
                .material(material)
                .transactionType(TransactionType.EXCHANGE)
                .quantity(2)
                .transactionDate(LocalDateTime.of(2026, 3, 7, 16, 0))
                .createdBy(user)
                .build();

        when(inventoryTransactionRepository.findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(
                any(LocalDateTime.class),
                any(LocalDateTime.class)
        )).thenReturn(List.of(inbound, outbound, returned, exchanged));

        InventoryCalendarService service = new InventoryCalendarService(inventoryTransactionRepository);
        InventoryCalendarResponse response = service.getCalendar("2026-03");

        assertEquals("2026-03", response.month());
        assertEquals(31, response.days().size());
        assertEquals(34, response.totalInboundQty());
        assertEquals(10, response.totalOutboundQty());
        assertEquals(3, response.activeDays());
        assertEquals(4, response.transactionCount());

        assertEquals(30, response.days().get(4).inboundQty());
        assertEquals(10, response.days().get(4).outboundQty());
        assertEquals(2, response.days().get(4).transactionCount());
        assertEquals(4, response.days().get(5).inboundQty());
        assertEquals(0, response.days().get(6).netQty());

        assertEquals("입고", response.transactions().get(0).transactionLabel());
        assertEquals("반입", response.transactions().get(2).transactionLabel());
        assertEquals("교환", response.transactions().get(3).transactionLabel());
    }

    @Test
    void rejectsInvalidMonthFormat() {
        InventoryCalendarService service = new InventoryCalendarService(inventoryTransactionRepository);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.getCalendar("2026/03")
        );

        assertEquals(BAD_REQUEST, exception.getStatusCode());
    }
}
