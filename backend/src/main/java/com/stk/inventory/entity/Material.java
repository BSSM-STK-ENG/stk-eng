package com.stk.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "materials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Material {

    @Id
    @Column(name = "material_code", nullable = false)
    private String materialCode;

    @Column(name = "material_name", nullable = false)
    private String materialName;

    @Column(name = "location")
    private String location;

    @Column(name = "safe_stock_qty")
    private Integer safeStockQty;

    // Derived field, computed or updated by a background job / trigger
    @Column(name = "current_stock_qty")
    private Integer currentStockQty;
}
