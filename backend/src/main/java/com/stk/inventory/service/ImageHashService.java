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

    private static final int HASH_SIZE = 8;
    private static final int DCT_SIZE = 32;

    public String computePHash(String imageData) {
        try {
            byte[] bytes = decodeImageData(imageData);
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(bytes));
            if (original == null) return null;

            BufferedImage resized = new BufferedImage(DCT_SIZE, DCT_SIZE, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2 = resized.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g2.drawImage(original, 0, 0, DCT_SIZE, DCT_SIZE, null);
            g2.dispose();

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

        } catch (Exception e) {
            log.warn("pHash computation failed: {}", e.getMessage());
            return null;
        }
    }

    public int hammingDistance(String h1, String h2) {
        if (h1 == null || h2 == null || h1.length() != h2.length()) {
            return HASH_SIZE * HASH_SIZE;
        }
        int dist = 0;
        for (int i = 0; i < h1.length(); i++) {
            if (h1.charAt(i) != h2.charAt(i)) dist++;
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

    private byte[] decodeImageData(String imageData) {
        if (imageData == null || imageData.isBlank()) throw new IllegalArgumentException("Empty image data");
        String base64 = imageData.contains(",") ? imageData.substring(imageData.indexOf(',') + 1) : imageData;
        return Base64.getDecoder().decode(base64.trim());
    }
}
