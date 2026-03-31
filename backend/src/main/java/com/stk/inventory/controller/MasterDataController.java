package com.stk.inventory.controller;

import com.stk.inventory.dto.MasterDataCreateRequest;
import com.stk.inventory.dto.MasterDataItemResponse;
import com.stk.inventory.service.MasterDataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/master-data")
public class MasterDataController {

    private final MasterDataService masterDataService;

    public MasterDataController(MasterDataService masterDataService) {
        this.masterDataService = masterDataService;
    }

    @GetMapping("/business-units")
    public ResponseEntity<List<MasterDataItemResponse>> getBusinessUnits() {
        return ResponseEntity.ok(masterDataService.getBusinessUnits());
    }

    @PostMapping("/business-units")
    public ResponseEntity<MasterDataItemResponse> createBusinessUnit(@RequestBody MasterDataCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createBusinessUnit(request));
    }

    @PutMapping("/business-units/{id}")
    public ResponseEntity<MasterDataItemResponse> updateBusinessUnit(@PathVariable Long id, @RequestBody MasterDataCreateRequest request) {
        return ResponseEntity.ok(masterDataService.updateBusinessUnit(id, request));
    }

    @DeleteMapping("/business-units/{id}")
    public ResponseEntity<Map<String, String>> deleteBusinessUnit(@PathVariable Long id) {
        masterDataService.deleteBusinessUnit(id);
        return ResponseEntity.ok(Map.of("message", "사업장을 삭제했습니다."));
    }

    @GetMapping("/managers")
    public ResponseEntity<List<MasterDataItemResponse>> getManagers() {
        return ResponseEntity.ok(masterDataService.getManagers());
    }

    @PostMapping("/managers")
    public ResponseEntity<MasterDataItemResponse> createManager(@RequestBody MasterDataCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createManager(request));
    }

    @DeleteMapping("/managers/{id}")
    public ResponseEntity<Map<String, String>> deleteManager(@PathVariable Long id) {
        masterDataService.deleteManager(id);
        return ResponseEntity.ok(Map.of("message", "담당자를 삭제했습니다."));
    }
}
