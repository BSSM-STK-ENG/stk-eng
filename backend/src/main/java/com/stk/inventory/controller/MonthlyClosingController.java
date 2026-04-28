package com.stk.inventory.controller;

import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.service.MonthlyClosingService;
import com.stk.inventory.service.FinanceAccessService;
import com.stk.inventory.mapper.MonthlyClosingMapper;
import com.stk.inventory.dto.MonthlyClosingDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/closing")
public class MonthlyClosingController {

    private final MonthlyClosingService closingService;
    private final MonthlyClosingMapper monthlyClosingMapper;
    private final FinanceAccessService financeAccessService;

    public MonthlyClosingController(MonthlyClosingService closingService,
                                    MonthlyClosingMapper monthlyClosingMapper,
                                    FinanceAccessService financeAccessService) {
        this.closingService = closingService;
        this.monthlyClosingMapper = monthlyClosingMapper;
        this.financeAccessService = financeAccessService;
    }

    @GetMapping
    public ResponseEntity<List<MonthlyClosingDto>> getAllClosings() {
        boolean includeFinancials = financeAccessService.canViewFinancialSummaries();
        return ResponseEntity.ok(closingService.getAllClosings().stream()
                .map(closing -> monthlyClosingMapper.toDto(closing, includeFinancials))
                .toList());
    }

    @PostMapping("/{month}/close")
    public ResponseEntity<MonthlyClosingDto> closeMonth(@PathVariable String month) {
        return ResponseEntity.ok(monthlyClosingMapper.toDto(
                closingService.closeMonth(month),
                financeAccessService.canViewFinancialSummaries()
        ));
    }

    @PostMapping("/{month}/unclose")
    public ResponseEntity<Void> uncloseMonth(@PathVariable String month) {
        closingService.uncloseMonth(month);
        return ResponseEntity.noContent().build();
    }
}
