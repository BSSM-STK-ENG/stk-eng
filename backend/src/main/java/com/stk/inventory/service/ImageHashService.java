package com.stk.inventory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;

@Slf4j
@Service
public class ImageHashService {

    private static final String SIGNATURE_VERSION = "v2";
    private static final int HASH_SIZE = 8;
    private static final int DCT_SIZE = 32;
    private static final int HUE_BINS = 12;
    private static final int GRAYSCALE_BINS = 4;
    private static final int COLOR_BINS = HUE_BINS + GRAYSCALE_BINS;
    private static final double SHAPE_WEIGHT = 0.55;
    private static final double COLOR_WEIGHT = 0.45;
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 20_000_000L;

    public String computePHash(String imageData) {
        try {
            BufferedImage original = readImage(imageData);
            if (original == null) return null;

            BufferedImage resized = new BufferedImage(DCT_SIZE, DCT_SIZE, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2 = resized.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g2.drawImage(original, 0, 0, DCT_SIZE, DCT_SIZE, null);
            g2.dispose();

            return SIGNATURE_VERSION + ":" + computeShapeHash(resized) + ":" + computeColorHistogramHex(resized);
        } catch (Exception e) {
            log.warn("pHash computation failed: {}", e.getMessage());
            return null;
        }
    }

    public ImageSimilarity compare(String querySignature, String candidateSignature) {
        ImageSignature query = ImageSignature.parse(querySignature);
        ImageSignature candidate = ImageSignature.parse(candidateSignature);
        if (query == null || candidate == null) {
            return new ImageSimilarity(HASH_SIZE * HASH_SIZE, 0);
        }

        int shapeDistance = hammingDistance(query.shapeHash(), candidate.shapeHash());
        double shapeSimilarity = 1.0 - (shapeDistance / 64.0);
        double weightedSimilarity = shapeSimilarity;
        if (query.hasColorHistogram() && candidate.hasColorHistogram()) {
            double colorSimilarity = colorSimilarity(query.colorHistogram(), candidate.colorHistogram());
            weightedSimilarity = (shapeSimilarity * SHAPE_WEIGHT) + (colorSimilarity * COLOR_WEIGHT);
        }
        int similarity = clamp((int) Math.round(weightedSimilarity * 100), 0, 100);
        int distance = clamp((int) Math.round((1.0 - weightedSimilarity) * 64), 0, 64);
        return new ImageSimilarity(distance, similarity);
    }

    public int hammingDistance(String h1, String h2) {
        ImageSignature left = ImageSignature.parse(h1);
        ImageSignature right = ImageSignature.parse(h2);
        String leftShape = left == null ? h1 : left.shapeHash();
        String rightShape = right == null ? h2 : right.shapeHash();
        if (!isLegacyShapeHash(leftShape) || !isLegacyShapeHash(rightShape)) {
            return HASH_SIZE * HASH_SIZE;
        }
        int dist = 0;
        for (int i = 0; i < leftShape.length(); i++) {
            if (leftShape.charAt(i) != rightShape.charAt(i)) dist++;
        }
        return dist;
    }

    private String computeShapeHash(BufferedImage resized) {
        double[][] pixels = new double[DCT_SIZE][DCT_SIZE];
        for (int y = 0; y < DCT_SIZE; y++) {
            for (int x = 0; x < DCT_SIZE; x++) {
                int rgb = resized.getRGB(x, y);
                pixels[y][x] = 0.299 * ((rgb >> 16) & 0xFF)
                        + 0.587 * ((rgb >> 8) & 0xFF)
                        + 0.114 * (rgb & 0xFF);
            }
        }

        double[][] dct = applyDCT2D(pixels);

        double[] lowFreq = new double[HASH_SIZE * HASH_SIZE];
        for (int y = 0; y < HASH_SIZE; y++) {
            for (int x = 0; x < HASH_SIZE; x++) {
                lowFreq[y * HASH_SIZE + x] = dct[y][x];
            }
        }

        // Mean excluding DC component [0,0]
        double sum = 0;
        for (int i = 1; i < lowFreq.length; i++) sum += lowFreq[i];
        double mean = sum / (lowFreq.length - 1);

        StringBuilder hash = new StringBuilder();
        for (double v : lowFreq) hash.append(v >= mean ? '1' : '0');
        return hash.toString();
    }

    private String computeColorHistogramHex(BufferedImage resized) {
        int[] bins = new int[COLOR_BINS];
        for (int y = 0; y < resized.getHeight(); y++) {
            for (int x = 0; x < resized.getWidth(); x++) {
                int rgb = resized.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                float[] hsb = Color.RGBtoHSB(r, g, b, null);
                int bin;
                if (hsb[1] < 0.18f) {
                    bin = HUE_BINS + Math.min(GRAYSCALE_BINS - 1, (int) (hsb[2] * GRAYSCALE_BINS));
                } else {
                    bin = Math.min(HUE_BINS - 1, (int) (hsb[0] * HUE_BINS));
                }
                bins[bin]++;
            }
        }

        int pixelCount = resized.getWidth() * resized.getHeight();
        StringBuilder histogram = new StringBuilder(COLOR_BINS * 2);
        for (int bin : bins) {
            int normalized = clamp((int) Math.round(bin * 255.0 / pixelCount), 0, 255);
            histogram.append(String.format("%02x", normalized));
        }
        return histogram.toString();
    }

    private double colorSimilarity(int[] left, int[] right) {
        if (left == null || right == null || left.length != COLOR_BINS || right.length != COLOR_BINS) {
            return 1.0;
        }
        int distance = 0;
        for (int i = 0; i < COLOR_BINS; i++) {
            distance += Math.abs(left[i] - right[i]);
        }
        return 1.0 - Math.min(1.0, distance / 510.0);
    }

    private double[][] applyDCT2D(double[][] pixels) {
        int N = pixels.length;
        double[][] rowResult = new double[N][N];
        for (int y = 0; y < N; y++) rowResult[y] = dct1D(pixels[y]);

        double[][] result = new double[N][N];
        for (int x = 0; x < N; x++) {
            double[] col = new double[N];
            for (int y = 0; y < N; y++) col[y] = rowResult[y][x];
            double[] colDct = dct1D(col);
            for (int y = 0; y < N; y++) result[y][x] = colDct[y];
        }
        return result;
    }

    private double[] dct1D(double[] input) {
        int N = input.length;
        double[] output = new double[N];
        for (int k = 0; k < N; k++) {
            double s = 0;
            for (int n = 0; n < N; n++) {
                s += input[n] * Math.cos(Math.PI * k * (2.0 * n + 1) / (2.0 * N));
            }
            output[k] = s;
        }
        return output;
    }

    private BufferedImage readImage(String imageData) throws Exception {
        byte[] bytes = decodeImageData(imageData);
        if (bytes.length > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image payload is too large");
        }
        BufferedImage original = ImageIO.read(new ByteArrayInputStream(bytes));
        if (original == null) return null;
        long pixelCount = (long) original.getWidth() * original.getHeight();
        if (pixelCount > MAX_IMAGE_PIXELS) {
            throw new IllegalArgumentException("Image dimensions are too large");
        }
        return original;
    }

    private byte[] decodeImageData(String imageData) {
        if (imageData == null || imageData.isBlank()) throw new IllegalArgumentException("Empty image data");
        String base64 = imageData.contains(",") ? imageData.substring(imageData.indexOf(',') + 1) : imageData;
        long estimatedBytes = (long) Math.ceil(base64.trim().length() * 3.0 / 4.0);
        if (estimatedBytes > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image payload is too large");
        }
        return Base64.getDecoder().decode(base64.trim());
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static boolean isLegacyShapeHash(String value) {
        return value != null && value.matches("[01]{64}");
    }

    public record ImageSimilarity(int distance, int similarity) {
    }

    private record ImageSignature(String shapeHash, int[] colorHistogram) {
        private boolean hasColorHistogram() {
            return colorHistogram != null && colorHistogram.length == COLOR_BINS;
        }

        private static ImageSignature parse(String rawSignature) {
            if (rawSignature == null || rawSignature.isBlank()) {
                return null;
            }
            String trimmed = rawSignature.trim();
            if (isLegacyShapeHash(trimmed)) {
                return new ImageSignature(trimmed, null);
            }

            String[] parts = trimmed.split(":", -1);
            if (parts.length != 3 || !SIGNATURE_VERSION.equals(parts[0]) || !isLegacyShapeHash(parts[1])) {
                return null;
            }
            return new ImageSignature(parts[1], parseHistogram(parts[2]));
        }

        private static int[] parseHistogram(String histogramHex) {
            if (histogramHex == null || histogramHex.length() != COLOR_BINS * 2 || !histogramHex.matches("[0-9a-fA-F]+")) {
                return null;
            }
            int[] histogram = new int[COLOR_BINS];
            for (int i = 0; i < COLOR_BINS; i++) {
                histogram[i] = Integer.parseInt(histogramHex.substring(i * 2, i * 2 + 2), 16);
            }
            return histogram;
        }
    }
}
