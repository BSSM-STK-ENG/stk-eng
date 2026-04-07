package com.stk.inventory.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public PasswordChangeRequiredFilter(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isAllowedPath(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            filterChain.doFilter(request, response);
            return;
        }

        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null || !user.isPasswordChangeRequired()) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        objectMapper.writeValue(response.getWriter(), Map.of(
                "message", "초기 비밀번호 설정이 필요합니다."
        ));
    }

    private boolean isAllowedPath(HttpServletRequest request) {
        String path = request.getServletPath();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return "/api/auth/login".equals(path)
                || "/api/auth/register".equals(path)
                || "/api/auth/verify-email".equals(path)
                || "/api/auth/change-password".equals(path)
                || "/api/auth/me".equals(path)
                || "/error".equals(path);
    }
}
