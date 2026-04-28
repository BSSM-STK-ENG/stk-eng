package com.stk.inventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import com.stk.inventory.service.MaterialService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MaterialController.class)
@AutoConfigureMockMvc(addFilters = false)
class MaterialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MaterialService materialService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private PasswordChangeRequiredFilter passwordChangeRequiredFilter;

    @Test
    void updateMaterialSupportsCodesWithSlashInRequestBody() throws Exception {
        MaterialDto dto = new MaterialDto();
        dto.setMaterialCode("AA03340001110/AAS1000001987");
        dto.setMaterialName("테스트 자재");
        dto.setLocation("13_5");
        dto.setCurrentStockQty(0);
        dto.setSafeStockQty(0);

        Mockito.when(materialService.updateMaterial(eq("AA03340001110/AAS1000001987"), any(MaterialDto.class)))
                .thenReturn(dto);

        mockMvc.perform(put("/api/materials")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialCode").value("AA03340001110/AAS1000001987"));
    }

    @Test
    void deleteMaterialAcceptsMaterialCodeAsRequestParam() throws Exception {
        mockMvc.perform(delete("/api/materials")
                        .param("materialCode", "AA03340001110/AAS1000001987"))
                .andExpect(status().isNoContent());

        Mockito.verify(materialService).deleteMaterial("AA03340001110/AAS1000001987");
    }

    @Test
    void searchByImageRejectsBlankImagePayload() throws Exception {
        mockMvc.perform(post("/api/materials/search/image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageData\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("검색할 이미지를 입력해주세요."));

        Mockito.verifyNoInteractions(materialService);
    }
}
