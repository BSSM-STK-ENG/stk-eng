package com.stk.inventory.repository;

import com.stk.inventory.entity.CustomRoleProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomRoleProfileRepository extends JpaRepository<CustomRoleProfile, Long> {
    List<CustomRoleProfile> findAllByOrderByCreatedAtAsc();
    Optional<CustomRoleProfile> findByKey(String key);
    boolean existsByLabelIgnoreCase(String label);
}
