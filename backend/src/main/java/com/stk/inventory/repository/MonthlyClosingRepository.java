package com.stk.inventory.repository;

import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.ClosingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonthlyClosingRepository extends JpaRepository<MonthlyClosing, String> {
    List<MonthlyClosing> findAllByOrderByClosingMonthDesc();

    boolean existsByStatusAndClosingMonthGreaterThan(ClosingStatus status, String closingMonth);
}
