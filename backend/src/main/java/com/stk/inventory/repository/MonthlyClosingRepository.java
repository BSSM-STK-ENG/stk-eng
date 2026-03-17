package com.stk.inventory.repository;

import com.stk.inventory.entity.MonthlyClosing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MonthlyClosingRepository extends JpaRepository<MonthlyClosing, String> {
}
