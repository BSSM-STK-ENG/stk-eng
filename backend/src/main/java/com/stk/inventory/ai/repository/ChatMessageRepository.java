package com.stk.inventory.ai.repository;

import com.stk.inventory.ai.entity.ChatMessage;
import com.stk.inventory.ai.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findAllBySessionOrderByCreatedAtAsc(ChatSession session);
}
