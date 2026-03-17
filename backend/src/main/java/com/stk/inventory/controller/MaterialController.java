package com.stk.inventory.controller;

import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.service.MaterialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @GetMapping
    public ResponseEntity<List<MaterialDto>> getAllMaterials() {
        return ResponseEntity.ok(materialService.getAllMaterials());
    }

    @PostMapping
    public ResponseEntity<MaterialDto> createMaterial(@RequestBody MaterialDto materialDto) {
        return ResponseEntity.ok(materialService.createMaterial(materialDto));
    }
}
