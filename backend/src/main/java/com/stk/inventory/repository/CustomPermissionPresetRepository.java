package com.stk.inventory.repository;

import com.stk.inventory.entity.CustomPermissionPreset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomPermissionPresetRepository extends JpaRepository<CustomPermissionPreset, Long> {
    List<CustomPermissionPreset> findAllByOrderByCreatedAtAsc();
    Optional<CustomPermissionPreset> findByKey(String key);
    boolean existsByLabelIgnoreCase(String label);
}
