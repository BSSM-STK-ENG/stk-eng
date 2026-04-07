package com.stk.inventory.service;

import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.Material;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.TransactionType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelService {

    public ByteArrayInputStream exportTransactionsToExcel(List<InventoryTransaction> transactions, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            // Header Row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Date", "Type", "Material Code", "Material Name", "Quantity", "Business Unit", "Manager", "Note", "Reference", "Registered By"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            // Data Rows
            int rowIdx = 1;
            for (InventoryTransaction tx : transactions) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(tx.getTransactionDate().toString());
                row.createCell(1).setCellValue(tx.getTransactionType().name());
                row.createCell(2).setCellValue(tx.getMaterial().getMaterialCode());
                row.createCell(3).setCellValue(tx.getMaterial().getMaterialName());
                row.createCell(4).setCellValue(tx.getQuantity());
                row.createCell(5).setCellValue(tx.getBusinessUnit() != null ? tx.getBusinessUnit() : "");
                row.createCell(6).setCellValue(tx.getManager() != null ? tx.getManager() : "");
                row.createCell(7).setCellValue(tx.getNote() != null ? tx.getNote() : "");
                row.createCell(8).setCellValue(tx.getReference() != null ? tx.getReference() : "");
                row.createCell(9).setCellValue(tx.getCreatedBy() != null ? tx.getCreatedBy().getEmail() : "");
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("failed to export data to Excel file: " + e.getMessage());
        }
    }

    public ByteArrayInputStream exportCurrentStockToExcel(List<Material> materials, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Material Code", "Material Name", "Location", "Safe Stock", "Current Stock"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            int rowIdx = 1;
            for (Material m : materials) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(m.getMaterialCode());
                row.createCell(1).setCellValue(m.getMaterialName());
                row.createCell(2).setCellValue(m.getLocation() != null ? m.getLocation() : "");
                row.createCell(3).setCellValue(m.getSafeStockQty() != null ? m.getSafeStockQty() : 0);
                row.createCell(4).setCellValue(m.getCurrentStockQty() != null ? m.getCurrentStockQty() : 0);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("failed to export data to Excel file: " + e.getMessage());
        }
    }

    public ByteArrayInputStream exportClosingToExcel(List<MonthlyClosing> closings, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Closing Month", "Status", "Closed By", "Closed At"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            int rowIdx = 1;
            for (MonthlyClosing c : closings) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(c.getClosingMonth());
                row.createCell(1).setCellValue(c.getStatus().name());
                row.createCell(2).setCellValue(c.getClosedBy() != null ? c.getClosedBy().getEmail() : "");
                row.createCell(3).setCellValue(c.getClosedAt() != null ? c.getClosedAt().toString() : "");
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("failed to export data to Excel file: " + e.getMessage());
        }
    }
}
