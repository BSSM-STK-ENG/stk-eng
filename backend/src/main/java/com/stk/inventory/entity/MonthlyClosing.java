package com.stk.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

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
}
