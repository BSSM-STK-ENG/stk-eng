package com.stk.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImageSearchResult {
    private MaterialDto material;
    private int distance;   // Hamming distance 0–64, lower = more similar
    private int similarity; // 0–100%, higher = more similar
}
