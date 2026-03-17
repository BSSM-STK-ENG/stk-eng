package com.stk.inventory.controller;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.service.ExcelService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExcelService excelService;
    private final InventoryTransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;

    public ExportController(ExcelService excelService, InventoryTransactionRepository transactionRepository, MaterialRepository materialRepository) {
        this.excelService = excelService;
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
    }

    @GetMapping("/{type}")
    public ResponseEntity<InputStreamResource> exportData(@PathVariable String type) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String filename = type.toLowerCase() + "_" + dateStr + ".xlsx";
        ByteArrayInputStream in = null;

        List<InventoryTransaction> txs = transactionRepository.findAll();
        List<Material> materials = materialRepository.findAll();

        switch (type.toLowerCase()) {
            case "inbound":
                List<InventoryTransaction> inbounds = txs.stream().filter(t -> t.getTransactionType().name().equals("IN")).collect(Collectors.toList());
                in = excelService.exportTransactionsToExcel(inbounds, "Inbound");
                filename = "입고_내역_" + dateStr + ".xlsx";
                break;
            case "outbound":
                List<InventoryTransaction> outbounds = txs.stream().filter(t -> t.getTransactionType().name().equals("OUT")).collect(Collectors.toList());
                in = excelService.exportTransactionsToExcel(outbounds, "Outbound");
                filename = "출고_내역_" + dateStr + ".xlsx";
                break;
            case "current":
                in = excelService.exportCurrentStockToExcel(materials, "Current Stock");
                filename = "재고_현황_" + dateStr + ".xlsx";
                break;
            case "ledger":
                in = excelService.exportTransactionsToExcel(txs, "Ledger");
                filename = "수불_현황_" + dateStr + ".xlsx";
                break;
            case "history":
                in = excelService.exportTransactionsToExcel(txs, "History");
                filename = "변경_이력_" + dateStr + ".xlsx";
                break;
            default:
                throw new IllegalArgumentException("Unknown export type: " + type);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=" + filename);

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
