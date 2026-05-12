package com.stk.inventory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
public class ImageHashService {

    private static final String SIGNATURE_VERSION = "v3";
    private static final String COLOR_SIGNATURE_VERSION = "v2";
    private static final int HASH_SIZE = 8;
    private static final int DCT_SIZE = 32;
    private static final int CONTENT_SAMPLE_SIZE = 128;
    private static final int EDGE_SIZE = 48;
    private static final int MAX_SHAPE_HASHES = 3;
    private static final int HUE_BINS = 12;
    private static final int GRAYSCALE_BINS = 4;
    private static final int COLOR_BINS = HUE_BINS + GRAYSCALE_BINS;
    private static final int EDGE_BINS = 8;
    private static final double V2_SHAPE_WEIGHT = 0.55;
    private static final double V2_COLOR_WEIGHT = 0.45;
    private static final double V3_SHAPE_WEIGHT = 0.40;
    private static final double V3_EDGE_WEIGHT = 0.30;
    private static final double V3_COLOR_WEIGHT = 0.30;
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 20_000_000L;

    public String computePHash(String imageData) {
        try {
            BufferedImage original = readImage(imageData);
            if (original == null) return null;

            BufferedImage contentCrop = cropToContent(original);
            List<String> shapeHashes = computeShapeHashes(original, contentCrop);
            if (shapeHashes.isEmpty()) return null;

            String colorHistogram = computeColorHistogramHex(resize(contentCrop, DCT_SIZE, DCT_SIZE));
            String edgeHistogram = computeEdgeHistogramHex(resize(contentCrop, EDGE_SIZE, EDGE_SIZE));
            return SIGNATURE_VERSION
                    + ":"
                    + String.join(",", shapeHashes)
                    + ":"
                    + colorHistogram
                    + ":"
                    + edgeHistogram;
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

        int shapeDistance = bestShapeDistance(query.shapeHashes(), candidate.shapeHashes());
        double shapeSimilarity = 1.0 - (shapeDistance / 64.0);
        double weightedSimilarity = shapeSimilarity;

        if (query.hasEdgeHistogram() && candidate.hasEdgeHistogram()
                && query.hasColorHistogram() && candidate.hasColorHistogram()) {
            double edgeSimilarity = histogramSimilarity(query.edgeHistogram(), candidate.edgeHistogram());
            double colorSimilarity = histogramSimilarity(query.colorHistogram(), candidate.colorHistogram());
            weightedSimilarity = (shapeSimilarity * V3_SHAPE_WEIGHT)
                    + (edgeSimilarity * V3_EDGE_WEIGHT)
                    + (colorSimilarity * V3_COLOR_WEIGHT);
        } else if (query.hasColorHistogram() && candidate.hasColorHistogram()) {
            double colorSimilarity = histogramSimilarity(query.colorHistogram(), candidate.colorHistogram());
            weightedSimilarity = (shapeSimilarity * V2_SHAPE_WEIGHT) + (colorSimilarity * V2_COLOR_WEIGHT);
        }

        int similarity = clamp((int) Math.round(weightedSimilarity * 100), 0, 100);
        int distance = clamp((int) Math.round((1.0 - weightedSimilarity) * 64), 0, 64);
        return new ImageSimilarity(distance, similarity);
    }

    public int hammingDistance(String h1, String h2) {
        ImageSignature left = ImageSignature.parse(h1);
        ImageSignature right = ImageSignature.parse(h2);
        String leftShape = left == null ? h1 : left.primaryShapeHash();
        String rightShape = right == null ? h2 : right.primaryShapeHash();
        if (!isLegacyShapeHash(leftShape) || !isLegacyShapeHash(rightShape)) {
            return HASH_SIZE * HASH_SIZE;
        }
        return hammingDistanceForShape(leftShape, rightShape);
    }

    private List<String> computeShapeHashes(BufferedImage original, BufferedImage contentCrop) {
        Set<String> hashes = new LinkedHashSet<>();
        addShapeHash(hashes, original);
        addShapeHash(hashes, contentCrop);
        addShapeHash(hashes, centerCrop(original, 0.72));

        List<String> result = new ArrayList<>(MAX_SHAPE_HASHES);
        for (String hash : hashes) {
            result.add(hash);
            if (result.size() == MAX_SHAPE_HASHES) break;
        }
        return result;
    }

    private void addShapeHash(Set<String> hashes, BufferedImage image) {
        if (hashes.size() >= MAX_SHAPE_HASHES) return;
        hashes.add(computeShapeHash(resize(image, DCT_SIZE, DCT_SIZE)));
    }

    private String computeShapeHash(BufferedImage resized) {
        double[][] pixels = new double[DCT_SIZE][DCT_SIZE];
        for (int y = 0; y < DCT_SIZE; y++) {
            for (int x = 0; x < DCT_SIZE; x++) {
                int rgb = resized.getRGB(x, y);
                pixels[y][x] = luminance(rgb);
            }
        }

        double[][] dct = applyDCT2D(pixels);

        double[] lowFreq = new double[HASH_SIZE * HASH_SIZE];
        for (int y = 0; y < HASH_SIZE; y++) {
            for (int x = 0; x < HASH_SIZE; x++) {
                lowFreq[y * HASH_SIZE + x] = dct[y][x];
            }
        }

        double sum = 0;
        for (int i = 1; i < lowFreq.length; i++) sum += lowFreq[i];
        double mean = sum / (lowFreq.length - 1);

        StringBuilder hash = new StringBuilder(HASH_SIZE * HASH_SIZE);
        for (double v : lowFreq) hash.append(v >= mean ? '1' : '0');
        return hash.toString();
    }

    private BufferedImage cropToContent(BufferedImage original) {
        BufferedImage sample = resize(original, CONTENT_SAMPLE_SIZE, CONTENT_SAMPLE_SIZE);
        Color background = estimateBorderColor(sample);
        int minX = CONTENT_SAMPLE_SIZE;
        int minY = CONTENT_SAMPLE_SIZE;
        int maxX = -1;
        int maxY = -1;

        for (int y = 1; y < CONTENT_SAMPLE_SIZE - 1; y++) {
            for (int x = 1; x < CONTENT_SAMPLE_SIZE - 1; x++) {
                int rgb = sample.getRGB(x, y);
                int distance = colorDistance(rgb, background);
                double edge = simpleEdgeMagnitude(sample, x, y);
                float[] hsb = Color.RGBtoHSB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF, null);
                boolean saturatedObject = hsb[1] > 0.28f && distance > 18;

                if (distance > 34 || edge > 42 || saturatedObject) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (maxX < minX || maxY < minY) return original;

        int boxWidth = maxX - minX + 1;
        int boxHeight = maxY - minY + 1;
        double boxRatio = (boxWidth * boxHeight) / (double) (CONTENT_SAMPLE_SIZE * CONTENT_SAMPLE_SIZE);
        if (boxRatio < 0.02 || boxRatio > 0.94) {
            return original;
        }

        double scaleX = original.getWidth() / (double) CONTENT_SAMPLE_SIZE;
        double scaleY = original.getHeight() / (double) CONTENT_SAMPLE_SIZE;
        int padX = Math.max(2, (int) Math.round(boxWidth * scaleX * 0.08));
        int padY = Math.max(2, (int) Math.round(boxHeight * scaleY * 0.08));
        int cropX = clamp((int) Math.floor(minX * scaleX) - padX, 0, original.getWidth() - 1);
        int cropY = clamp((int) Math.floor(minY * scaleY) - padY, 0, original.getHeight() - 1);
        int cropRight = clamp((int) Math.ceil((maxX + 1) * scaleX) + padX, cropX + 1, original.getWidth());
        int cropBottom = clamp((int) Math.ceil((maxY + 1) * scaleY) + padY, cropY + 1, original.getHeight());

        return original.getSubimage(cropX, cropY, cropRight - cropX, cropBottom - cropY);
    }

    private BufferedImage centerCrop(BufferedImage original, double ratio) {
        int cropWidth = Math.max(1, (int) Math.round(original.getWidth() * ratio));
        int cropHeight = Math.max(1, (int) Math.round(original.getHeight() * ratio));
        int cropX = Math.max(0, (original.getWidth() - cropWidth) / 2);
        int cropY = Math.max(0, (original.getHeight() - cropHeight) / 2);
        return original.getSubimage(cropX, cropY, cropWidth, cropHeight);
    }

    private Color estimateBorderColor(BufferedImage image) {
        int border = Math.max(1, image.getWidth() / 16);
        long red = 0;
        long green = 0;
        long blue = 0;
        long count = 0;
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                if (x >= border && x < image.getWidth() - border
                        && y >= border && y < image.getHeight() - border) {
                    continue;
                }
                int rgb = image.getRGB(x, y);
                red += (rgb >> 16) & 0xFF;
                green += (rgb >> 8) & 0xFF;
                blue += rgb & 0xFF;
                count++;
            }
        }
        if (count == 0) return Color.WHITE;
        return new Color((int) (red / count), (int) (green / count), (int) (blue / count));
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
        return histogramToHex(bins, pixelCount);
    }

    private String computeEdgeHistogramHex(BufferedImage resized) {
        double[] bins = new double[EDGE_BINS];
        double total = 0;

        for (int y = 1; y < resized.getHeight() - 1; y++) {
            for (int x = 1; x < resized.getWidth() - 1; x++) {
                double gx = -luminance(resized.getRGB(x - 1, y - 1))
                        - (2 * luminance(resized.getRGB(x - 1, y)))
                        - luminance(resized.getRGB(x - 1, y + 1))
                        + luminance(resized.getRGB(x + 1, y - 1))
                        + (2 * luminance(resized.getRGB(x + 1, y)))
                        + luminance(resized.getRGB(x + 1, y + 1));
                double gy = -luminance(resized.getRGB(x - 1, y - 1))
                        - (2 * luminance(resized.getRGB(x, y - 1)))
                        - luminance(resized.getRGB(x + 1, y - 1))
                        + luminance(resized.getRGB(x - 1, y + 1))
                        + (2 * luminance(resized.getRGB(x, y + 1)))
                        + luminance(resized.getRGB(x + 1, y + 1));
                double magnitude = Math.hypot(gx, gy);
                if (magnitude < 8) continue;

                double angle = Math.atan2(gy, gx);
                if (angle < 0) angle += Math.PI;
                if (angle >= Math.PI) angle -= Math.PI;
                int bin = Math.min(EDGE_BINS - 1, (int) Math.floor((angle / Math.PI) * EDGE_BINS));
                bins[bin] += magnitude;
                total += magnitude;
            }
        }

        int[] normalized = new int[EDGE_BINS];
        if (total > 0) {
            for (int i = 0; i < EDGE_BINS; i++) {
                normalized[i] = clamp((int) Math.round(bins[i] * 255.0 / total), 0, 255);
            }
        }
        return histogramToHex(normalized, 255);
    }

    private String histogramToHex(int[] bins, int total) {
        StringBuilder histogram = new StringBuilder(bins.length * 2);
        for (int bin : bins) {
            int normalized = total == 255 ? bin : clamp((int) Math.round(bin * 255.0 / total), 0, 255);
            histogram.append(String.format("%02x", normalized));
        }
        return histogram.toString();
    }

    private double histogramSimilarity(int[] left, int[] right) {
        if (left == null || right == null || left.length != right.length) {
            return 1.0;
        }
        int distance = 0;
        for (int i = 0; i < left.length; i++) {
            distance += Math.abs(left[i] - right[i]);
        }
        return 1.0 - Math.min(1.0, distance / 510.0);
    }

    private int bestShapeDistance(List<String> leftHashes, List<String> rightHashes) {
        if (leftHashes.isEmpty() || rightHashes.isEmpty()) return HASH_SIZE * HASH_SIZE;

        int bestDistance = HASH_SIZE * HASH_SIZE;
        for (String leftHash : leftHashes) {
            for (String rightHash : rightHashes) {
                bestDistance = Math.min(bestDistance, hammingDistanceForShape(leftHash, rightHash));
            }
        }
        return bestDistance;
    }

    private int hammingDistanceForShape(String leftShape, String rightShape) {
        if (!isLegacyShapeHash(leftShape) || !isLegacyShapeHash(rightShape)) {
            return HASH_SIZE * HASH_SIZE;
        }

        int dist = 0;
        for (int i = 0; i < leftShape.length(); i++) {
            if (leftShape.charAt(i) != rightShape.charAt(i)) dist++;
        }
        return dist;
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

    private BufferedImage resize(BufferedImage source, int width, int height) {
        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2 = resized.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2.drawImage(source, 0, 0, width, height, null);
        g2.dispose();
        return resized;
    }

    private double simpleEdgeMagnitude(BufferedImage image, int x, int y) {
        double horizontal = luminance(image.getRGB(x + 1, y)) - luminance(image.getRGB(x - 1, y));
        double vertical = luminance(image.getRGB(x, y + 1)) - luminance(image.getRGB(x, y - 1));
        return Math.hypot(horizontal, vertical);
    }

    private int colorDistance(int rgb, Color color) {
        int redDistance = ((rgb >> 16) & 0xFF) - color.getRed();
        int greenDistance = ((rgb >> 8) & 0xFF) - color.getGreen();
        int blueDistance = (rgb & 0xFF) - color.getBlue();
        return (int) Math.round(Math.sqrt(
                (redDistance * redDistance) + (greenDistance * greenDistance) + (blueDistance * blueDistance)
        ));
    }

    private double luminance(int rgb) {
        return 0.299 * ((rgb >> 16) & 0xFF)
                + 0.587 * ((rgb >> 8) & 0xFF)
                + 0.114 * (rgb & 0xFF);
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

    private record ImageSignature(List<String> shapeHashes, int[] colorHistogram, int[] edgeHistogram) {
        private String primaryShapeHash() {
            return shapeHashes.isEmpty() ? null : shapeHashes.get(0);
        }

        private boolean hasColorHistogram() {
            return colorHistogram != null && colorHistogram.length == COLOR_BINS;
        }

        private boolean hasEdgeHistogram() {
            return edgeHistogram != null && edgeHistogram.length == EDGE_BINS;
        }

        private static ImageSignature parse(String rawSignature) {
            if (rawSignature == null || rawSignature.isBlank()) {
                return null;
            }
            String trimmed = rawSignature.trim();
            if (isLegacyShapeHash(trimmed)) {
                return new ImageSignature(List.of(trimmed), null, null);
            }

            String[] parts = trimmed.split(":", -1);
            if (parts.length == 3 && COLOR_SIGNATURE_VERSION.equals(parts[0]) && isLegacyShapeHash(parts[1])) {
                return new ImageSignature(List.of(parts[1]), parseHistogram(parts[2], COLOR_BINS), null);
            }
            if (parts.length != 4 || !SIGNATURE_VERSION.equals(parts[0])) {
                return null;
            }

            List<String> hashes = parseShapeHashes(parts[1]);
            if (hashes.isEmpty()) {
                return null;
            }
            return new ImageSignature(
                    hashes,
                    parseHistogram(parts[2], COLOR_BINS),
                    parseHistogram(parts[3], EDGE_BINS)
            );
        }

        private static List<String> parseShapeHashes(String rawShapeHashes) {
            if (rawShapeHashes == null || rawShapeHashes.isBlank()) {
                return List.of();
            }

            List<String> hashes = new ArrayList<>();
            String[] parts = rawShapeHashes.split(",", -1);
            for (String part : parts) {
                if (!isLegacyShapeHash(part)) {
                    return List.of();
                }
                hashes.add(part);
            }
            return hashes;
        }

        private static int[] parseHistogram(String histogramHex, int expectedBins) {
            if (histogramHex == null
                    || histogramHex.length() != expectedBins * 2
                    || !histogramHex.matches("[0-9a-fA-F]+")) {
                return null;
            }
            int[] histogram = new int[expectedBins];
            for (int i = 0; i < expectedBins; i++) {
                histogram[i] = Integer.parseInt(histogramHex.substring(i * 2, i * 2 + 2), 16);
            }
            return histogram;
        }
    }
}
