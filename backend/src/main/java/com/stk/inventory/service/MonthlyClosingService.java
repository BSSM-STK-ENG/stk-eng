package com.stk.inventory.service;

import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.MonthlyClosing;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.MonthlyClosingRepository;
import com.stk.inventory.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MonthlyClosingService {

    private final MonthlyClosingRepository closingRepository;
    private final UserRepository userRepository;

    public MonthlyClosingService(MonthlyClosingRepository closingRepository, UserRepository userRepository) {
        this.closingRepository = closingRepository;
        this.userRepository = userRepository;
    }

    public List<MonthlyClosing> getAllClosings() {
        return closingRepository.findAll();
    }

    public MonthlyClosing closeMonth(String month) { // Format: YYYY-MM
        MonthlyClosing closing = closingRepository.findById(month)
                .orElse(MonthlyClosing.builder().closingMonth(month).build());
        
        closing.setStatus(ClosingStatus.CLOSED);
        closing.setClosedBy(getCurrentUser());
        closing.setClosedAt(LocalDateTime.now());
        
        return closingRepository.save(closing);
    }

    public MonthlyClosing uncloseMonth(String month) {
        MonthlyClosing closing = closingRepository.findById(month)
                .orElseThrow(() -> new IllegalArgumentException("Month not found"));
        
        closing.setStatus(ClosingStatus.UNCLOSED);
        closing.setClosedBy(null);
        closing.setClosedAt(null);
        
        return closingRepository.save(closing);
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String email = ((UserDetails) principal).getUsername();
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}
