package com.stk.inventory.service;

import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    void searchByImageRanksMatchingColorAheadOfSameShapeDifferentColor() {
        ImageHashService realImageHashService = new ImageHashService();
        MaterialService service = new MaterialService(materialRepository, inventoryTransactionRepository, realImageHashService);
        String redImage = imageDataUrl(new Color(220, 40, 40));
        String blueImage = imageDataUrl(new Color(35, 80, 220));
        Material redMaterial = Material.builder()
                .materialCode("RED")
                .materialName("Red material")
                .imageUrl(redImage)
                .build();
        Material blueMaterial = Material.builder()
                .materialCode("BLUE")
                .materialName("Blue material")
                .imageUrl(blueImage)
                .build();

        when(materialRepository.findAll()).thenReturn(List.of(blueMaterial, redMaterial));

        List<com.stk.inventory.dto.ImageSearchResult> results = service.searchByImage(redImage);

        assertEquals("RED", results.get(0).getMaterial().getMaterialCode());
        assertTrue(results.get(0).getSimilarity() > results.get(1).getSimilarity());
    }

    @Test
    void searchByImageKeepsLegacyShapeHashCandidatesComparable() {
        ImageHashService realImageHashService = new ImageHashService();
        MaterialService service = new MaterialService(materialRepository, inventoryTransactionRepository, realImageHashService);
        Material legacyMaterial = Material.builder()
                .materialCode("LEGACY")
                .materialName("Legacy hash material")
                .imageHash("0".repeat(64))
                .build();

        when(materialRepository.findAll()).thenReturn(List.of(legacyMaterial));

        List<com.stk.inventory.dto.ImageSearchResult> results = service.searchByImage(imageDataUrl(new Color(220, 40, 40)));

        assertEquals(1, results.size());
        assertEquals("LEGACY", results.get(0).getMaterial().getMaterialCode());
        assertTrue(results.get(0).getDistance() >= 0 && results.get(0).getDistance() <= 64);
        assertTrue(results.get(0).getSimilarity() >= 0 && results.get(0).getSimilarity() <= 100);
    }

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

    private String imageDataUrl(Color color) {
        try {
            BufferedImage image = new BufferedImage(96, 96, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            graphics.setColor(color);
            graphics.fillRect(0, 0, 96, 96);
            graphics.setColor(color.brighter());
            graphics.fillOval(22, 22, 52, 52);
            graphics.dispose();

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create test image", exception);
        }
    }
}
