package com.stk.inventory.controller;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.service.ExcelService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExcelService excelService;
    private final InventoryTransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;
    private final MonthlyClosingRepository closingRepository;

    public ExportController(ExcelService excelService, InventoryTransactionRepository transactionRepository, MaterialRepository materialRepository, MonthlyClosingRepository closingRepository) {
        this.excelService = excelService;
        this.transactionRepository = transactionRepository;
        this.materialRepository = materialRepository;
        this.closingRepository = closingRepository;
    }

    @GetMapping("/{type}")
    public ResponseEntity<InputStreamResource> exportData(@PathVariable String type) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        ByteArrayInputStream in;
        String filename;

        switch (type.toLowerCase()) {
            case "inbound": {
                List<InventoryTransaction> inbounds = transactionRepository.findByTransactionType(TransactionType.IN);
                in = excelService.exportTransactionsToExcel(inbounds, "입고");
                filename = "입고_내역_" + dateStr + ".xlsx";
                break;
            }
            case "outbound": {
                List<InventoryTransaction> outbounds = transactionRepository.findByTransactionType(TransactionType.OUT);
                in = excelService.exportTransactionsToExcel(outbounds, "출고");
                filename = "출고_내역_" + dateStr + ".xlsx";
                break;
            }
            case "current": {
                in = excelService.exportCurrentStockToExcel(materialRepository.findAll(), "재고현황");
                filename = "재고_현황_" + dateStr + ".xlsx";
                break;
            }
            case "ledger": {
                in = excelService.exportTransactionsToExcel(transactionRepository.findAll(), "수불현황");
                filename = "수불_현황_" + dateStr + ".xlsx";
                break;
            }
            case "history": {
                in = excelService.exportTransactionsToExcel(transactionRepository.findAll(), "변경이력");
                filename = "변경_이력_" + dateStr + ".xlsx";
                break;
            }
            case "closing": {
                List<MonthlyClosing> closings = closingRepository.findAll();
                in = excelService.exportClosingToExcel(closings, "월마감");
                filename = "월마감_현황_" + dateStr + ".xlsx";
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown export type: " + type);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8)
                        .build()
        );

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
