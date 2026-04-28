package com.stk.inventory.service;

import com.stk.inventory.dto.TransactionRequest;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.MaterialRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.List;

@Service
public class ExcelUploadService {

    private final InventoryService inventoryService;
    private final MaterialRepository materialRepository;

    public ExcelUploadService(InventoryService inventoryService, MaterialRepository materialRepository) {
        this.inventoryService = inventoryService;
        this.materialRepository = materialRepository;
    }

    @Transactional
    public void processUpload(MultipartFile file, TransactionType type) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename != null && filename.toLowerCase().endsWith(".csv")) {
            processCsvUpload(file, type);
        } else {
            processExcelUpload(file, type);
        }
    }

    private void processCsvUpload(MultipartFile file, TransactionType type) throws Exception {
        try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
            String line;
            boolean isFirst = true;

            int dateIdx = -1, codeIdx = -1, nameIdx = -1, qtyIdx = -1, refIdx = -1, noteIdx = -1, managerIdx = -1;

            while ((line = br.readLine()) != null) {
                String[] cols = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"); // handle quotes
                for(int i=0; i<cols.length; i++) cols[i] = cols[i].replace("\"", "").trim();

                if (isFirst) {
                    for (int i = 0; i < cols.length; i++) {
                        String header = cols[i];
                        if (header.contains("날짜") || header.contains("일자")) dateIdx = i;
                        if (header.contains("자재코드")) codeIdx = i;
                        if (header.contains("자재명")) nameIdx = i;
                        if (header.contains("수량")) qtyIdx = i;
                        if (header.contains("사업장") || header.contains("참고") || header.contains("위치")) refIdx = i;
                        if (header.contains("비고")) noteIdx = i;
                        if (header.contains("담당자")) managerIdx = i;
                    }
                    if (codeIdx == -1) codeIdx = 1;
                    if (qtyIdx == -1) qtyIdx = 4;
                    isFirst = false;
                    continue;
                }

                if (cols.length <= codeIdx || cols[codeIdx].isEmpty()) continue;
                String materialCode = cols[codeIdx];
                String materialName = nameIdx != -1 && cols.length > nameIdx ? cols[nameIdx] : "Unknown Material";
                
                int quantity = 0;
                if (qtyIdx != -1 && cols.length > qtyIdx) {
                    try { quantity = (int) Double.parseDouble(cols[qtyIdx]); } catch (Exception ignored) {}
                }

                String reference = refIdx != -1 && cols.length > refIdx ? cols[refIdx] : "";
                String note = noteIdx != -1 && cols.length > noteIdx ? cols[noteIdx] : "";
                String manager = managerIdx != -1 && cols.length > managerIdx ? cols[managerIdx] : "";
                LocalDateTime transactionDate = LocalDateTime.now();
                if (dateIdx != -1 && cols.length > dateIdx) {
                    transactionDate = parseDateTime(cols[dateIdx]);
                }

                saveData(type, materialCode, materialName, quantity, reference, note, manager, transactionDate);
            }
        }
    }

    private void processExcelUpload(MultipartFile file, TransactionType type) throws Exception {
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {
            
            Sheet sheet = type == TransactionType.IN ? workbook.getSheet("입고 조회") : workbook.getSheet("출고 내역");
            if (sheet == null) {
                sheet = workbook.getSheetAt(0);
            }

            Iterator<Row> rows = sheet.iterator();
            
            if (!rows.hasNext()) return;
            Row headerRow = rows.next();
            
            int dateIdx = -1, codeIdx = -1, nameIdx = -1, qtyIdx = -1, refIdx = -1, noteIdx = -1, managerIdx = -1;
            for (Cell cell : headerRow) {
                String header = getCellValue(cell).trim();
                if (header.contains("날짜") || header.contains("일자")) dateIdx = cell.getColumnIndex();
                if (header.contains("자재코드")) codeIdx = cell.getColumnIndex();
                if (header.contains("자재명")) nameIdx = cell.getColumnIndex();
                if (header.contains("수량")) qtyIdx = cell.getColumnIndex();
                if (header.contains("사업장") || header.contains("참고") || header.contains("위치")) refIdx = cell.getColumnIndex();
                if (header.contains("비고")) noteIdx = cell.getColumnIndex();
                if (header.contains("담당자")) managerIdx = cell.getColumnIndex();
            }

            if (codeIdx == -1) codeIdx = 1;
            if (qtyIdx == -1) qtyIdx = 4;
            
            while (rows.hasNext()) {
                Row row = rows.next();
                String codeVal = getCellValue(row.getCell(codeIdx));
                if (codeVal.isEmpty()) continue;

                String materialCode = codeVal;
                String materialName = nameIdx != -1 ? getCellValue(row.getCell(nameIdx)) : "Unknown Material";
                
                String qtyStr = getCellValue(row.getCell(qtyIdx));
                int quantity = 0;
                try { quantity = (int) Double.parseDouble(qtyStr); } catch (Exception ignored) {}

                String reference = refIdx != -1 ? getCellValue(row.getCell(refIdx)) : "";
                String note = noteIdx != -1 ? getCellValue(row.getCell(noteIdx)) : "";
                String manager = managerIdx != -1 ? getCellValue(row.getCell(managerIdx)) : "";

                LocalDateTime transactionDate = LocalDateTime.now();
                if (dateIdx != -1 && row.getCell(dateIdx) != null) {
                    Cell dateCell = row.getCell(dateIdx);
                    if (DateUtil.isCellDateFormatted(dateCell)) {
                        transactionDate = dateCell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                    }
                }

                saveData(type, materialCode, materialName, quantity, reference, note, manager, transactionDate);
            }
        }
    }

    private void saveData(TransactionType type, String materialCode, String materialName, int quantity, String reference, String note, String manager, LocalDateTime transactionDate) {
        if (quantity > 0) {
            Material material = materialRepository.findById(materialCode).orElse(null);
            if (material == null) {
                throw new IllegalArgumentException("미리 등록되지 않은 자재는 업로드할 수 없습니다: " + materialCode + " (" + materialName + ")");
            }

            TransactionRequest req = new TransactionRequest();
            req.setMaterialCode(materialCode);
            req.setQuantity(quantity);
            req.setBusinessUnit(reference);
            req.setNote(note);
            req.setManager(manager);
            req.setTransactionDate(transactionDate);

            if (type == TransactionType.IN) {
                inventoryService.processInbound(req);
            } else if (type == TransactionType.OUT) {
                inventoryService.processOutbound(req);
            }
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue().trim();
            case NUMERIC: 
                if (DateUtil.isCellDateFormatted(cell)) return cell.getDateCellValue().toString();
                return String.valueOf(cell.getNumericCellValue());
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            default: return "";
        }
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return LocalDateTime.now();
        }

        String normalized = raw.trim();
        List<DateTimeFormatter> dateFormats = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")
        );

        for (DateTimeFormatter formatter : dateFormats) {
            try {
                return LocalDateTime.parse(normalized, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        List<DateTimeFormatter> dateOnlyFormats = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("yyyy/MM/dd"),
                DateTimeFormatter.ofPattern("yyyy.M.d"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd")
        );

        for (DateTimeFormatter formatter : dateOnlyFormats) {
            try {
                return LocalDate.parse(normalized, formatter).atStartOfDay();
            } catch (DateTimeParseException ignored) {
            }
        }

        return LocalDateTime.now();
    }
}
