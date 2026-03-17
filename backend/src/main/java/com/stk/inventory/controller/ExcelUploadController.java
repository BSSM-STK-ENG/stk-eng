package com.stk.inventory.controller;

import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.service.ExcelUploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/inventory/upload")
public class ExcelUploadController {

    private final ExcelUploadService excelUploadService;

    public ExcelUploadController(ExcelUploadService excelUploadService) {
        this.excelUploadService = excelUploadService;
    }

    @PostMapping("/inbound")
    public ResponseEntity<?> uploadInbound(@RequestParam("file") MultipartFile file) {
        try {
            excelUploadService.processUpload(file, TransactionType.IN);
            return ResponseEntity.ok().body("{\"message\": \"Upload successful\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("{\"message\": \"Upload failed: " + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/outbound")
    public ResponseEntity<?> uploadOutbound(@RequestParam("file") MultipartFile file) {
        try {
            excelUploadService.processUpload(file, TransactionType.OUT);
            return ResponseEntity.ok().body("{\"message\": \"Upload successful\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("{\"message\": \"Upload failed: " + e.getMessage() + "\"}");
        }
    }
}
