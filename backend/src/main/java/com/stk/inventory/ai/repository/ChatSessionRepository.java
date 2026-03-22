package com.stk.inventory.ai.repository;

import com.stk.inventory.ai.entity.ChatSession;
import com.stk.inventory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findAllByUserOrderByUpdatedAtDesc(User user);
    Optional<ChatSession> findByIdAndUser(UUID id, User user);
}
