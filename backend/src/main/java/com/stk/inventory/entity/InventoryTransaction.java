package com.stk.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_code", nullable = false)
    private Material material;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate;

    @Column(name = "business_unit")
    private String businessUnit;

    @Column(name = "manager")
    private String manager;

    @Column(name = "note")
    private String note;

    @Column(name = "reference")
    private String reference;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "manager_user_id")
    private User managerUser;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @Column(name = "reverted", nullable = false)
    @Builder.Default
    private boolean reverted = false;

    @Column(name = "system_generated", nullable = false)
    @Builder.Default
    private boolean systemGenerated = false;

    @Column(name = "reversal_of_transaction_id")
    private Long reversalOfTransactionId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reverted_by_user_id")
    private User revertedBy;

    @Column(name = "reverted_at")
    private LocalDateTime revertedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
