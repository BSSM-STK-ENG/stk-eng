package com.stk.inventory.dto;

import lombok.Data;

@Data
public class MaterialDto {
    private String materialCode;
    private String materialName;
    private String location;
    private Integer safeStockQty;
    private Integer currentStockQty;
}
