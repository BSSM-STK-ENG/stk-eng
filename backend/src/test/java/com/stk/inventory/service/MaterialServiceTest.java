package com.stk.inventory.service;

import com.stk.inventory.entity.Material;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Polygon;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
    void searchByImageMatchesSameMaterialAcrossBackgroundLightingAndPoseChanges() {
        ImageHashService realImageHashService = new ImageHashService();
        MaterialService service = new MaterialService(materialRepository, inventoryTransactionRepository, realImageHashService);
        String storedBolt = boltImageDataUrl(new Color(246, 246, 242), new Color(72, 72, 70), 0, 0, 0, 1.0);
        String queryBolt = boltImageDataUrl(new Color(218, 232, 243), new Color(120, 120, 116), 12, 8, -3, 0.88);
        String blueCableTie = cableTieImageDataUrl(new Color(250, 250, 250), new Color(38, 98, 220), -6, 2, 0, 1.0);
        String redCableTie = cableTieImageDataUrl(new Color(248, 244, 240), new Color(216, 42, 42), 8, -3, 2, 1.05);
        Material bolt = Material.builder()
                .materialCode("BOLT")
                .materialName("Bolt")
                .imageUrl(storedBolt)
                .build();
        Material blueTie = Material.builder()
                .materialCode("BLUE-TIE")
                .materialName("Blue cable tie")
                .imageUrl(blueCableTie)
                .build();
        Material redTie = Material.builder()
                .materialCode("RED-TIE")
                .materialName("Red cable tie")
                .imageUrl(redCableTie)
                .build();

        when(materialRepository.findAll()).thenReturn(List.of(redTie, blueTie, bolt));

        List<com.stk.inventory.dto.ImageSearchResult> results = service.searchByImage(queryBolt);

        assertEquals("BOLT", results.get(0).getMaterial().getMaterialCode());
        assertTrue(results.get(0).getSimilarity() > results.get(1).getSimilarity(),
                () -> "expected bolt variant to outrank other materials, got " + results);
    }

    @Test
    void computePHashProducesCompactV3Signature() {
        ImageHashService realImageHashService = new ImageHashService();

        String signature = realImageHashService.computePHash(
                boltImageDataUrl(new Color(246, 246, 242), new Color(72, 72, 70), 0, 0, 0, 1.0)
        );

        assertNotNull(signature);
        assertTrue(signature.startsWith("v3:"));
        assertTrue(signature.length() <= 255, () -> "signature length should fit existing image_hash column: " + signature.length());
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
            applyQualityHints(graphics);
            graphics.setColor(color);
            graphics.fillRect(0, 0, 96, 96);
            graphics.setColor(color.brighter());
            graphics.fillOval(22, 22, 52, 52);
            graphics.dispose();

            return toDataUrl(image);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create test image", exception);
        }
    }

    private String boltImageDataUrl(Color background, Color metal, double angleDegrees, int offsetX, int offsetY, double scale) {
        try {
            BufferedImage image = new BufferedImage(160, 120, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            applyQualityHints(graphics);
            graphics.setColor(background);
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());

            graphics.translate((image.getWidth() / 2.0) + offsetX, (image.getHeight() / 2.0) + offsetY);
            graphics.rotate(Math.toRadians(angleDegrees));
            graphics.scale(scale, scale);
            graphics.setColor(new Color(0, 0, 0, 32));
            graphics.fillRoundRect(-44, -5, 94, 18, 8, 8);
            graphics.setColor(metal);
            graphics.fillPolygon(new Polygon(
                    new int[]{-68, -53, -35, -35, -53, -68},
                    new int[]{0, -18, -18, 18, 18, 0},
                    6
            ));
            graphics.fillRoundRect(-44, -10, 94, 20, 7, 7);
            graphics.fillPolygon(new Polygon(
                    new int[]{44, 58, 74, 74, 58, 44},
                    new int[]{-15, -15, 0, 15, 15, 0},
                    6
            ));
            graphics.setColor(metal.brighter());
            graphics.setStroke(new BasicStroke(3f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            graphics.drawLine(-40, -4, 45, -4);
            graphics.dispose();

            return toDataUrl(image);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create bolt test image", exception);
        }
    }

    private String cableTieImageDataUrl(Color background, Color color, double angleDegrees, int offsetX, int offsetY, double scale) {
        try {
            BufferedImage image = new BufferedImage(160, 120, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            applyQualityHints(graphics);
            graphics.setColor(background);
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());

            graphics.translate((image.getWidth() / 2.0) + offsetX, (image.getHeight() / 2.0) + offsetY);
            graphics.rotate(Math.toRadians(angleDegrees));
            graphics.scale(scale, scale);
            graphics.setStroke(new BasicStroke(10f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            graphics.setColor(color);
            graphics.drawOval(-45, -28, 82, 56);
            graphics.fillRoundRect(32, -9, 46, 18, 6, 6);
            graphics.setColor(color.darker());
            graphics.setStroke(new BasicStroke(3f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            graphics.drawLine(38, 0, 74, 0);
            graphics.dispose();

            return toDataUrl(image);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create cable tie test image", exception);
        }
    }

    private void applyQualityHints(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    }

    private String toDataUrl(BufferedImage image) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
    }
}
