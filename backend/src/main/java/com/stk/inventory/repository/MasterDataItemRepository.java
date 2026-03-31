package com.stk.inventory.repository;

import com.stk.inventory.entity.MasterDataItem;
import com.stk.inventory.entity.MasterDataType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MasterDataItemRepository extends JpaRepository<MasterDataItem, Long> {
    List<MasterDataItem> findAllByTypeOrderByNameAsc(MasterDataType type);

    Optional<MasterDataItem> findByTypeAndNameIgnoreCase(MasterDataType type, String name);

    boolean existsByTypeAndNameIgnoreCase(MasterDataType type, String name);
}
