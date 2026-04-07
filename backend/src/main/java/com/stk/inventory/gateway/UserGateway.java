package com.stk.inventory.gateway;

import com.stk.inventory.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserGateway {
    List<User> findAllByOrderByCreatedAtDesc();
    boolean existsByEmail(String email);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
    boolean existsByPermissionPreset(String presetKey);
    boolean existsByRoleProfileKey(String roleProfileKey);
    Optional<User> findByEmail(String email);
    Optional<User> findById(UUID id);
    User save(User user);
    void delete(User user);
    void flush();
}
