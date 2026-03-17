package com.stk.inventory.service;

import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.MaterialRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MaterialService {
    
    private final MaterialRepository materialRepository;

    public MaterialService(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    public List<MaterialDto> getAllMaterials() {
        return materialRepository.findAll().stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public MaterialDto createMaterial(MaterialDto dto) {
        Material material = Material.builder()
                .materialCode(dto.getMaterialCode())
                .materialName(dto.getMaterialName())
                .location(dto.getLocation())
                .safeStockQty(dto.getSafeStockQty())
                .currentStockQty(0)
                .build();
        material = materialRepository.save(material);
        return convertToDto(material);
    }

    private MaterialDto convertToDto(Material material) {
        MaterialDto dto = new MaterialDto();
        dto.setMaterialCode(material.getMaterialCode());
        dto.setMaterialName(material.getMaterialName());
        dto.setLocation(material.getLocation());
        dto.setSafeStockQty(material.getSafeStockQty());
        dto.setCurrentStockQty(material.getCurrentStockQty());
        return dto;
    }
}
