package com.stk.inventory.controller;

import com.stk.inventory.dto.PagedLedgerResponse;
import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.dto.InventoryCalendarResponse;
import com.stk.inventory.dto.StockTrendResponse;
import com.stk.inventory.dto.TransactionResponse;
import com.stk.inventory.service.InventoryCalendarService;
import com.stk.inventory.service.InventoryService;
import com.stk.inventory.usecase.InventoryUseCase;
import com.stk.inventory.service.StockTrendService;
import jakarta.validation.Valid;
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

    private final InventoryUseCase inventoryService;
    private final InventoryService inventoryServiceImpl;
    private final StockTrendService stockTrendService;
    private final InventoryCalendarService inventoryCalendarService;

    public InventoryController(InventoryUseCase inventoryService,
                               InventoryService inventoryServiceImpl,
                               StockTrendService stockTrendService,
                               InventoryCalendarService inventoryCalendarService) {
        this.inventoryService = inventoryService;
        this.inventoryServiceImpl = inventoryServiceImpl;
        this.stockTrendService = stockTrendService;
        this.inventoryCalendarService = inventoryCalendarService;
    }

    @PostMapping("/inbound")
    public ResponseEntity<TransactionResponse> inbound(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.processInbound(request));
    }

    @PostMapping("/outbound")
    public ResponseEntity<TransactionResponse> outbound(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.processOutbound(request));
    }

    @GetMapping("/ledger")
    public ResponseEntity<PagedLedgerResponse> getLedger(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String unit,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(inventoryServiceImpl.getLedgerPaged(type, from, to, q, unit, page, size));
    }

    @GetMapping("/history")
    public ResponseEntity<java.util.List<com.stk.inventory.dto.InventoryTransactionResponse>> getHistory() {
        return ResponseEntity.ok(inventoryService.getHistory());
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

    @PostMapping("/{id}/revert")
    public ResponseEntity<Map<String, String>> revertTransaction(@PathVariable Long id) {
        inventoryService.revertTransaction(id);
        return ResponseEntity.ok(Map.of("message", "되돌리기가 완료되었습니다."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(@PathVariable Long id, @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(inventoryService.updateTransaction(id, request));
    }
}
