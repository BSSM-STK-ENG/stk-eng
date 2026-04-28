package com.stk.inventory.service;

import com.stk.inventory.entity.Material;
import org.springframework.stereotype.Service;

@Service
public class LowStockService {

    public boolean isLowStock(Material material) {
        if (material == null) {
            return false;
        }
        int safeStock = material.getSafeStockQty() == null ? 0 : material.getSafeStockQty();
        int currentStock = material.getCurrentStockQty() == null ? 0 : material.getCurrentStockQty();
        return safeStock > 0 && currentStock <= safeStock;
    }
}
