package com.stk.inventory.service;

import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaterialServiceTest {

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Mock
    private ImageHashService imageHashService;

    @Test
    void updateMaterialImageRejectsInvalidImageData() {
        MaterialService service = new MaterialService(materialRepository, inventoryTransactionRepository, imageHashService);
        Material material = Material.builder()
                .materialCode("MAT-001")
                .materialName("테스트 자재")
                .build();

        when(materialRepository.findById("MAT-001")).thenReturn(Optional.of(material));
        when(imageHashService.computePHash("not-image")).thenReturn(null);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateMaterialImage("MAT-001", "not-image")
        );

        assertEquals("이미지를 처리할 수 없습니다.", exception.getMessage());
        verify(materialRepository, never()).save(any(Material.class));
    }
}
