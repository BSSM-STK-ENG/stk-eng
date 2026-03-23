package com.stk.inventory.controller;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.dto.InventoryCalendarResponse;
import com.stk.inventory.dto.StockTrendResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.service.InventoryCalendarService;
import com.stk.inventory.service.InventoryService;
import com.stk.inventory.service.StockTrendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;
    private final StockTrendService stockTrendService;
    private final InventoryCalendarService inventoryCalendarService;

    public InventoryController(InventoryService inventoryService,
                               StockTrendService stockTrendService,
                               InventoryCalendarService inventoryCalendarService) {
        this.inventoryService = inventoryService;
        this.stockTrendService = stockTrendService;
        this.inventoryCalendarService = inventoryCalendarService;
    }

    @PostMapping("/inbound")
    public ResponseEntity<InventoryTransaction> inbound(@RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.processInbound(request));
    }

    @PostMapping("/outbound")
    public ResponseEntity<InventoryTransaction> outbound(@RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.processOutbound(request));
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<InventoryTransaction>> getLedger() {
        return ResponseEntity.ok(inventoryService.getTransactions());
    }

    @GetMapping("/history")
    public ResponseEntity<List<InventoryTransaction>> getHistory() {
        return ResponseEntity.ok(inventoryService.getTransactions());
    }

    @GetMapping("/calendar")
    public ResponseEntity<InventoryCalendarResponse> getCalendar(
            @RequestParam(required = false) String month
    ) {
        return ResponseEntity.ok(inventoryCalendarService.getCalendar(month));
    }

    @GetMapping("/stock-trends")
    public ResponseEntity<StockTrendResponse> getStockTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String materialCodes
    ) {
        List<String> selectedCodes = materialCodes == null || materialCodes.isBlank()
                ? List.of()
                : Arrays.stream(materialCodes.split(","))
                        .map(String::trim)
                        .filter(code -> !code.isBlank())
                        .toList();
        return ResponseEntity.ok(stockTrendService.getStockTrends(from, to, selectedCodes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteTransaction(@PathVariable Long id) {
        inventoryService.deleteTransaction(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryTransaction> updateTransaction(@PathVariable Long id, @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.updateTransaction(id, request));
    }
}
