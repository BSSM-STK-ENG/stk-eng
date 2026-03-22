package com.stk.inventory.ai.entity;

import com.stk.inventory.ai.model.ChatRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ChatRole role;

    @Lob
    @Column(nullable = false)
    private String content;

    @Lob
    @Column(name = "tool_metadata")
    private String toolMetadata;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
