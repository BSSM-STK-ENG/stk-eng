package com.stk.inventory.ai.entity;

import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "provider_credentials",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProviderType provider;

    @Column(name = "encrypted_api_key", nullable = false, length = 4096)
    private String encryptedApiKey;

    @Column(name = "key_iv", nullable = false, length = 512)
    private String keyIv;

    @Column(name = "masked_value", nullable = false, length = 64)
    private String maskedValue;

    @Builder.Default
    @Column(name = "validation_status", length = 32)
    private String validationStatus = "unknown";

    @Column(name = "validation_message", length = 255)
    private String validationMessage;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
