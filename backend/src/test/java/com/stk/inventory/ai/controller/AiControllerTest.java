package com.stk.inventory.ai.controller;

import com.stk.inventory.ai.dto.*;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.ai.service.AiChatOrchestrationService;
import com.stk.inventory.ai.service.AiCurrentUserService;
import com.stk.inventory.ai.service.AiPreferencesService;
import com.stk.inventory.ai.service.ProviderCatalogService;
import com.stk.inventory.ai.service.ProviderCredentialService;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiController.class)
@AutoConfigureMockMvc(addFilters = false)
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProviderCatalogService providerCatalogService;

    @MockBean
    private ProviderCredentialService providerCredentialService;

    @MockBean
    private AiPreferencesService aiPreferencesService;

    @MockBean
    private AiCurrentUserService currentUserService;

    @MockBean
    private AiChatOrchestrationService aiChatOrchestrationService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private PasswordChangeRequiredFilter passwordChangeRequiredFilter;

    @Test
    void returnsProviders() throws Exception {
        Mockito.when(providerCatalogService.getProviders()).thenReturn(List.of(
                new ProviderDescriptorResponse("openai", "ChatGPT / OpenAI", "OpenAI responses API")
        ));

        mockMvc.perform(get("/api/ai/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("openai"))
                .andExpect(jsonPath("$[0].label").value("ChatGPT / OpenAI"));
    }

    @Test
    void returnsPreferences() throws Exception {
        Mockito.when(aiPreferencesService.getPreferences()).thenReturn(
                new AiPreferencesResponse("openai", "gpt-5", true)
        );

        mockMvc.perform(get("/api/ai/preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("openai"))
                .andExpect(jsonPath("$.model").value("gpt-5"))
                .andExpect(jsonPath("$.chatPanelEnabled").value(true));
    }

    @Test
    void updatesPreferences() throws Exception {
        Mockito.when(aiPreferencesService.updatePreferences(any(UpdateAiPreferencesRequest.class))).thenReturn(
                new AiPreferencesResponse("google", "gemini-2.5-pro", false)
        );

        mockMvc.perform(put("/api/ai/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "google",
                                  "model": "gemini-2.5-pro",
                                  "chatPanelEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("google"))
                .andExpect(jsonPath("$.model").value("gemini-2.5-pro"))
                .andExpect(jsonPath("$.chatPanelEnabled").value(false));
    }

    @Test
    void testsCredentialConnection() throws Exception {
        Mockito.when(providerCredentialService.testConnection(eq(ProviderType.OPENAI), eq("sk-test-1234"), eq("gpt-5")))
                .thenReturn(new CredentialConnectionTestResponse(true, "openai", "gpt-5", "연결 확인에 성공했습니다.", LocalDateTime.now()));

        mockMvc.perform(post("/api/ai/credentials/openai/test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "apiKey": "sk-test-1234",
                                  "model": "gpt-5"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.provider").value("openai"))
                .andExpect(jsonPath("$.model").value("gpt-5"));
    }

    @Test
    void returnsSessions() throws Exception {
        Mockito.when(aiChatOrchestrationService.getSessions()).thenReturn(List.of(
                new ChatSessionResponse(UUID.randomUUID(), "openai", "gpt-5", "inventory", "새 대화", LocalDateTime.now(), LocalDateTime.now())
        ));

        mockMvc.perform(get("/api/ai/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("openai"))
                .andExpect(jsonPath("$[0].model").value("gpt-5"));
    }

    @Test
    void createsSession() throws Exception {
        User user = User.builder().id(UUID.randomUUID()).email("test@test.com").role(Role.USER).password("pw").build();
        Mockito.when(currentUserService.requireCurrentUser()).thenReturn(user);
        Mockito.when(aiChatOrchestrationService.createSession(any(CreateSessionRequest.class))).thenReturn(
                new ChatSessionResponse(UUID.randomUUID(), "openai", "gpt-5-mini", "inventory", "새 대화", LocalDateTime.now(), LocalDateTime.now())
        );

        mockMvc.perform(post("/api/ai/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "openai",
                                  "model": "gpt-5-mini",
                                  "contextMode": "inventory",
                                  "title": "새 대화"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("openai"))
                .andExpect(jsonPath("$.contextMode").value("inventory"));
    }
}
