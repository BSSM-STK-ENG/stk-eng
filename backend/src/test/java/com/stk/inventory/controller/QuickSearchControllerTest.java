package com.stk.inventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.dto.QuickSearchResult;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import com.stk.inventory.service.QuickSearchService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(QuickSearchController.class)
@AutoConfigureMockMvc(addFilters = false)
class QuickSearchControllerTest {

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

    @Test
    void searchReturnsUnifiedQuickSearchResponse() throws Exception {
        MaterialDto materialDto = new MaterialDto();
        materialDto.setMaterialCode("MAT-001");
        materialDto.setMaterialName("검색 자재");

        MonthlyClosingDto closingDto = new MonthlyClosingDto();
        closingDto.closingMonth = "2026-04";
        closingDto.status = ClosingStatus.UNCLOSED;

        QuickSearchResult result = new QuickSearchResult();
        result.setQuery("mat");
        result.setMaterials(List.of(materialDto));
        result.setRecentTransactions(List.of());
        result.setCurrentClosing(closingDto);

        Mockito.when(quickSearchService.search("mat")).thenReturn(result);

        mockMvc.perform(post("/api/quick-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("query", "mat"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("mat"))
                .andExpect(jsonPath("$.materials[0].materialCode").value("MAT-001"))
                .andExpect(jsonPath("$.currentClosing.closingMonth").value("2026-04"))
                .andExpect(jsonPath("$.currentClosing.status").value("UNCLOSED"));
    }

    @Test
    void searchRejectsBlankQuery() throws Exception {
        mockMvc.perform(post("/api/quick-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("query", "   "))))
                .andExpect(status().isBadRequest());

        Mockito.verify(quickSearchService, Mockito.never()).search(Mockito.anyString());
    }
}
