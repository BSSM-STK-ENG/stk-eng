package com.stk.inventory.controller;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
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
