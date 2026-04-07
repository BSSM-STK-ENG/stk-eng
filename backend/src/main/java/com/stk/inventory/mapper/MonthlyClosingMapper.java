package com.stk.inventory.mapper;

import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.entity.MonthlyClosing;
import org.springframework.stereotype.Component;

@Component
public class MonthlyClosingMapper {

    public MonthlyClosingDto toDto(MonthlyClosing closing) {
        MonthlyClosingDto dto = new MonthlyClosingDto();
        dto.closingMonth = closing.getClosingMonth();
        dto.status = closing.getStatus();
        dto.closedAt = closing.getClosedAt();
        if (closing.getClosedBy() != null) {
            dto.closedByUserId = closing.getClosedBy().getId();
            dto.closedByEmail = closing.getClosedBy().getEmail();
        }
        return dto;
    }
}