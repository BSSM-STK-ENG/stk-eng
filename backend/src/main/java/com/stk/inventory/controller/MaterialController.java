package com.stk.inventory.controller;

import com.stk.inventory.dto.ImageSearchResult;
import com.stk.inventory.dto.ImageSearchRequest;
import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.dto.MaterialImageRequest;
import com.stk.inventory.service.MaterialService;
import jakarta.validation.Valid;
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

    @PutMapping
    public ResponseEntity<MaterialDto> updateMaterial(@RequestBody MaterialDto materialDto) {
        return ResponseEntity.ok(materialService.updateMaterial(materialDto.getMaterialCode(), materialDto));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteMaterial(@RequestParam String materialCode) {
        materialService.deleteMaterial(materialCode);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/image")
    public ResponseEntity<MaterialDto> uploadMaterialImage(
            @PathVariable String code,
            @Valid @RequestBody MaterialImageRequest request) {
        return ResponseEntity.ok(materialService.updateMaterialImage(code, request.getImageUrl()));
    }

    @PostMapping("/search/image")
    public ResponseEntity<List<ImageSearchResult>> searchByImage(@Valid @RequestBody ImageSearchRequest request) {
        return ResponseEntity.ok(materialService.searchByImage(request.getImageData()));
    }
}
