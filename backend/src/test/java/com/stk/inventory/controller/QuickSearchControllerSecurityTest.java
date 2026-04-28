package com.stk.inventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import com.stk.inventory.service.QuickSearchService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(QuickSearchController.class)
class QuickSearchControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private QuickSearchService quickSearchService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private PasswordChangeRequiredFilter passwordChangeRequiredFilter;

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0, ServletRequest.class), invocation.getArgument(1, ServletResponse.class));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));

        doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0, ServletRequest.class), invocation.getArgument(1, ServletResponse.class));
            return null;
        }).when(passwordChangeRequiredFilter).doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));

        Mockito.when(quickSearchService.search(any(String.class))).thenReturn(null);
    }

    @Test
    void searchRejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(post("/api/quick-search")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(java.util.Map.of("query", "mat"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void searchAllowsAuthenticatedUsersWithAuthorizedPagePermission() throws Exception {
        mockMvc.perform(post("/api/quick-search")
                        .with(user("dashboard@example.com").authorities(() -> "PAGE_DASHBOARD"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(java.util.Map.of("query", "mat"))))
                .andExpect(status().isOk());
    }
}
