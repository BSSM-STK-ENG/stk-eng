package com.stk.inventory.mapper;

import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.MonthlyClosing;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MonthlyClosingMapperTest {

    @Test
    void mapsMonthlySoldCountFromOutboundQuantity() {
        MonthlyClosing closing = MonthlyClosing.builder()
                .closingMonth("2026-09")
                .status(ClosingStatus.CLOSED)
                .monthlyOutboundCount(2)
                .monthlyOutboundQty(7)
                .build();

        MonthlyClosingDto dto = new MonthlyClosingMapper().toDto(closing, true);

        assertEquals(2, dto.monthlyOutboundCount);
        assertEquals(7, dto.monthlySoldCount);
    }
}
