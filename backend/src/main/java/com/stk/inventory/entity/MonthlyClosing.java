package com.stk.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_closing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyClosing {

    @Id
    @Column(name = "closing_month", length = 7) // Format: "YYYY-MM"
    private String closingMonth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClosingStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by_user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "total_stock_qty")
    private Integer totalStockQty;

    @Column(name = "monthly_outbound_count")
    private Integer monthlyOutboundCount;

    @Column(name = "monthly_inbound_qty")
    private Integer monthlyInboundQty;

    @Column(name = "monthly_outbound_qty")
    private Integer monthlyOutboundQty;

    @Column(name = "total_purchase_amount", precision = 19, scale = 2)
    private BigDecimal totalPurchaseAmount;

    @Column(name = "total_revenue_amount", precision = 19, scale = 2)
    private BigDecimal totalRevenueAmount;

    @Column(name = "margin", precision = 19, scale = 2)
    private BigDecimal margin;
}
