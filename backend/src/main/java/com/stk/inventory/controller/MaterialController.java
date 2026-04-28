package com.stk.inventory.controller;

import com.stk.inventory.dto.ImageSearchResult;
import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.service.MaterialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
            @RequestBody Map<String, String> body) {
        String imageUrl = body.get("imageUrl");
        return ResponseEntity.ok(materialService.updateMaterialImage(code, imageUrl));
    }

    @PostMapping("/search/image")
    public ResponseEntity<List<ImageSearchResult>> searchByImage(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(materialService.searchByImage(body.get("imageData")));
    }
}
