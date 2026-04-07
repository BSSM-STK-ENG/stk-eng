package com.stk.inventory.controller;

import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.service.MonthlyClosingService;
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

    public MonthlyClosingController(MonthlyClosingService closingService, MonthlyClosingMapper monthlyClosingMapper) {
        this.closingService = closingService;
        this.monthlyClosingMapper = monthlyClosingMapper;
    }

    @GetMapping
    public ResponseEntity<List<MonthlyClosingDto>> getAllClosings() {
        return ResponseEntity.ok(closingService.getAllClosings().stream().map(monthlyClosingMapper::toDto).toList());
    }

    @PostMapping("/{month}/close")
    public ResponseEntity<MonthlyClosingDto> closeMonth(@PathVariable String month) {
        return ResponseEntity.ok(monthlyClosingMapper.toDto(closingService.closeMonth(month)));
    }

    @PostMapping("/{month}/unclose")
    public ResponseEntity<MonthlyClosingDto> uncloseMonth(@PathVariable String month) {
        return ResponseEntity.ok(monthlyClosingMapper.toDto(closingService.uncloseMonth(month)));
    }
}
