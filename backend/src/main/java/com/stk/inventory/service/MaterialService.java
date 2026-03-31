package com.stk.inventory.service;

import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public MaterialService(MaterialRepository materialRepository,
                           InventoryTransactionRepository inventoryTransactionRepository) {
        this.materialRepository = materialRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    @Transactional(readOnly = true)
    public List<MaterialDto> getAllMaterials() {
        return materialRepository.findAllByOrderByMaterialCodeAsc().stream()
                .map(this::convertToDto)
                .toList();
    }

    @Transactional
    public MaterialDto createMaterial(MaterialDto dto) {
        String materialCode = normalizeRequired(dto.getMaterialCode(), "자재코드");
        if (materialRepository.existsByMaterialCodeIgnoreCase(materialCode)) {
            throw new IllegalArgumentException("이미 등록된 자재코드입니다.");
        }

        Material material = Material.builder()
                .materialCode(materialCode)
                .materialName(normalizeRequired(dto.getMaterialName(), "자재명"))
                .description(normalizeOptional(dto.getDescription()))
                .location(normalizeOptional(dto.getLocation()))
                .safeStockQty(normalizeStockValue(dto.getSafeStockQty()))
                .currentStockQty(Math.max(0, dto.getCurrentStockQty() == null ? 0 : dto.getCurrentStockQty()))
                .build();
        return convertToDto(materialRepository.save(material));
    }

    @Transactional
    public MaterialDto updateMaterial(String materialCode, MaterialDto dto) {
        Material material = materialRepository.findById(materialCode)
                .orElseThrow(() -> new IllegalArgumentException("자재를 찾을 수 없습니다."));

        material.setMaterialName(normalizeRequired(dto.getMaterialName(), "자재명"));
        material.setDescription(normalizeOptional(dto.getDescription()));
        material.setLocation(normalizeOptional(dto.getLocation()));
        material.setSafeStockQty(normalizeStockValue(dto.getSafeStockQty()));

        return convertToDto(materialRepository.save(material));
    }

    @Transactional
    public void deleteMaterial(String materialCode) {
        Material material = materialRepository.findById(materialCode)
                .orElseThrow(() -> new IllegalArgumentException("자재를 찾을 수 없습니다."));

        if ((material.getCurrentStockQty() == null ? 0 : material.getCurrentStockQty()) > 0) {
            throw new IllegalArgumentException("현재 재고가 남아 있는 자재는 삭제할 수 없습니다.");
        }

        if (inventoryTransactionRepository.existsByMaterialMaterialCode(materialCode)) {
            throw new IllegalArgumentException("거래 이력이 있는 자재는 삭제할 수 없습니다.");
        }

        materialRepository.delete(material);
    }

    @Transactional(readOnly = true)
    public Material requireRegisteredMaterial(String materialCode) {
        return materialRepository.findById(normalizeRequired(materialCode, "자재코드"))
                .orElseThrow(() -> new IllegalArgumentException("등록된 자재만 선택할 수 있습니다."));
    }

    private Integer normalizeStockValue(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private String normalizeRequired(String value, String label) {
        String normalized = normalizeOptional(value);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(label + "를 입력해주세요.");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private MaterialDto convertToDto(Material material) {
        MaterialDto dto = new MaterialDto();
        dto.setMaterialCode(material.getMaterialCode());
        dto.setMaterialName(material.getMaterialName());
        dto.setDescription(material.getDescription());
        dto.setLocation(material.getLocation());
        dto.setSafeStockQty(material.getSafeStockQty());
        dto.setCurrentStockQty(material.getCurrentStockQty());
        return dto;
    }
}
