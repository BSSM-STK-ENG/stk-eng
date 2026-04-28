package com.stk.inventory.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class FinanceAccessService {

    public boolean canViewFinancialSummaries() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if ("ROLE_SUPER_ADMIN".equals(value) || "ROLE_ADMIN".equals(value)) {
                return true;
            }
        }
        return false;
    }
}
