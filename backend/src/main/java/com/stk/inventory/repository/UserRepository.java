package com.stk.inventory.repository;

import com.stk.inventory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationToken(String token);
    Optional<User> findByNameIgnoreCase(String name);
    boolean existsByEmail(String email);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
    boolean existsByPermissionPreset(String permissionPreset);
    boolean existsByRoleProfileKey(String roleProfileKey);
    java.util.List<User> findAllByOrderByCreatedAtDesc();
    java.util.List<User> findAllByEmailVerifiedTrueOrderByNameAsc();
}
