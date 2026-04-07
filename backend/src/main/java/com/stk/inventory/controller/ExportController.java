package com.stk.inventory.controller;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.service.ExcelService;
import com.stk.inventory.service.InventoryTransactionSpec;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private static final List<TransactionType> INBOUND_TYPES = List.of(TransactionType.IN, TransactionType.RETURN);
    private static final List<TransactionType> OUTBOUND_TYPES = List.of(TransactionType.OUT, TransactionType.EXCHANGE);

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
    public ResponseEntity<InputStreamResource> exportData(
            @PathVariable String type,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String unit) {

        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        ByteArrayInputStream in;
        String filename;

        switch (type.toLowerCase()) {
            case "inbound": {
                List<InventoryTransaction> rows = transactionRepository.findAll(buildTransactionSpec(INBOUND_TYPES, from, to, q, unit));
                in = excelService.exportTransactionsToExcel(rows, "입고");
                filename = "입고_내역_" + dateStr + ".xlsx";
                break;
            }
            case "outbound": {
                List<InventoryTransaction> rows = transactionRepository.findAll(buildTransactionSpec(OUTBOUND_TYPES, from, to, q, unit));
                in = excelService.exportTransactionsToExcel(rows, "출고");
                filename = "출고_내역_" + dateStr + ".xlsx";
                break;
            }
            case "current": {
                in = excelService.exportCurrentStockToExcel(materialRepository.findAll(), "재고현황");
                filename = "재고_현황_" + dateStr + ".xlsx";
                break;
            }
            case "ledger": {
                List<InventoryTransaction> rows = transactionRepository.findAll(buildTransactionSpec(null, from, to, q, unit));
                in = excelService.exportTransactionsToExcel(rows, "수불현황");
                filename = "수불_현황_" + dateStr + ".xlsx";
                break;
            }
            case "history": {
                List<InventoryTransaction> rows = transactionRepository.findAll(buildTransactionSpec(null, from, to, q, unit));
                in = excelService.exportTransactionsToExcel(rows, "변경이력");
                filename = "변경_이력_" + dateStr + ".xlsx";
                break;
            }
            case "closing": {
                in = excelService.exportClosingToExcel(closingRepository.findAll(), "월마감");
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

    private Specification<InventoryTransaction> buildTransactionSpec(
            List<TransactionType> types, String from, String to, String q, String unit) {
        Specification<InventoryTransaction> spec = Specification.where(null);
        if (types != null) {
            spec = spec.and(InventoryTransactionSpec.hasTypes(types));
        }
        if (from != null && !from.isBlank()) {
            spec = spec.and(InventoryTransactionSpec.dateFrom(LocalDate.parse(from).atStartOfDay()));
        }
        if (to != null && !to.isBlank()) {
            spec = spec.and(InventoryTransactionSpec.dateTo(LocalDate.parse(to).plusDays(1).atStartOfDay()));
        }
        if (q != null && !q.isBlank()) {
            spec = spec.and(InventoryTransactionSpec.searchTerm(q));
        }
        if (unit != null && !unit.isBlank()) {
            spec = spec.and(InventoryTransactionSpec.hasBusinessUnit(unit));
        }
        return spec;
    }
}
