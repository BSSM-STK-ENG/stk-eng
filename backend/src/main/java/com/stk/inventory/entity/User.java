package com.stk.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.stk.inventory.ai.model.ProviderType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "display_name", unique = true, length = 60)
    private String name;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "permission_preset", length = 32)
    private String permissionPreset;

    @Column(name = "role_profile_key", length = 64)
    private String roleProfileKey;

    @Column(name = "page_permissions", columnDefinition = "text")
    private String pagePermissions;

    @Builder.Default
    @Column(name = "default_provider", length = 32)
    private String defaultProvider = ProviderType.OPENAI.value();

    @Builder.Default
    @Column(name = "default_model", length = 128)
    private String defaultModel = "gpt-5";

    @Builder.Default
    @Column(name = "chat_panel_enabled", nullable = false, columnDefinition = "boolean not null default false")
    private boolean chatPanelEnabled = false;

    @Builder.Default
    @Column(name = "password_change_required", nullable = false, columnDefinition = "boolean not null default false")
    private boolean passwordChangeRequired = false;

    @Builder.Default
    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean not null default false")
    private boolean emailVerified = false;

    @Column(name = "email_verification_token", length = 128)
    private String emailVerificationToken;

    @Column(name = "email_verification_expires_at")
    private LocalDateTime emailVerificationExpiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
