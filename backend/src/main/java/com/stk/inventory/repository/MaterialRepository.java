package com.stk.inventory.repository;

import com.stk.inventory.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialRepository extends JpaRepository<Material, String> {
    boolean existsByMaterialCodeIgnoreCase(String materialCode);

    List<Material> findAllByOrderByMaterialCodeAsc();
}
