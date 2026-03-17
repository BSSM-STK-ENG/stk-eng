package com.stk.inventory.controller;

import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.service.MonthlyClosingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/closing")
public class MonthlyClosingController {

    private final MonthlyClosingService closingService;

    public MonthlyClosingController(MonthlyClosingService closingService) {
        this.closingService = closingService;
    }

    @GetMapping
    public ResponseEntity<List<MonthlyClosing>> getAllClosings() {
        return ResponseEntity.ok(closingService.getAllClosings());
    }

    @PostMapping("/{month}/close")
    public ResponseEntity<MonthlyClosing> closeMonth(@PathVariable String month) {
        return ResponseEntity.ok(closingService.closeMonth(month));
    }

    @PostMapping("/{month}/unclose")
    public ResponseEntity<MonthlyClosing> uncloseMonth(@PathVariable String month) {
        return ResponseEntity.ok(closingService.uncloseMonth(month));
    }
}
