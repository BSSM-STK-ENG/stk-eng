package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.AiPreferencesResponse;
import com.stk.inventory.ai.dto.ModelDescriptorResponse;
import com.stk.inventory.ai.dto.UpdateAiPreferencesRequest;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class AiPreferencesServiceTest {

    @Mock
    private AiCurrentUserService currentUserService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProviderCatalogService providerCatalogService;

    @Test
    void returnsStoredPreferencesOrCatalogDefaults() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .password("pw")
                .role(Role.USER)
                .defaultProvider("anthropic")
                .defaultModel("claude-3-5-haiku-latest")
                .build();
        when(currentUserService.requireCurrentUser()).thenReturn(user);
        when(providerCatalogService.getModels(ProviderType.ANTHROPIC)).thenReturn(List.of(
                new ModelDescriptorResponse("claude-3-5-haiku-latest", "Claude 3.5 Haiku", "anthropic", "fast")
        ));

        AiPreferencesService service = new AiPreferencesService(currentUserService, userRepository, providerCatalogService);
        AiPreferencesResponse response = service.getPreferences();

        assertEquals("anthropic", response.provider());
        assertEquals("claude-3-5-haiku-latest", response.model());
        assertEquals(false, response.chatPanelEnabled());
    }

    @Test
    void fallsBackToCatalogDefaultsWhenUserPreferencesAreMissing() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .password("pw")
                .role(Role.USER)
                .build();
        user.setDefaultProvider(null);
        user.setDefaultModel(null);
        when(currentUserService.requireCurrentUser()).thenReturn(user);
        when(providerCatalogService.getDefaultProvider()).thenReturn(
                new com.stk.inventory.ai.dto.ProviderDescriptorResponse("openai", "ChatGPT / OpenAI", "OpenAI responses API")
        );
        when(providerCatalogService.getDefaultModel(ProviderType.OPENAI)).thenReturn(
                new ModelDescriptorResponse("gpt-5", "GPT-5", "openai", "flagship")
        );

        AiPreferencesService service = new AiPreferencesService(currentUserService, userRepository, providerCatalogService);
        AiPreferencesResponse response = service.getPreferences();

        assertEquals("openai", response.provider());
        assertEquals("gpt-5", response.model());
        assertEquals(false, response.chatPanelEnabled());
    }

    @Test
    void updatesAndPersistsPreferences() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .password("pw")
                .role(Role.USER)
                .build();
        when(currentUserService.requireCurrentUser()).thenReturn(user);
        when(providerCatalogService.getModels(ProviderType.GOOGLE)).thenReturn(List.of(
                new ModelDescriptorResponse("gemini-2.5-pro", "Gemini 2.5 Pro", "google", "flagship")
        ));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiPreferencesService service = new AiPreferencesService(currentUserService, userRepository, providerCatalogService);
        AiPreferencesResponse response = service.updatePreferences(new UpdateAiPreferencesRequest("google", "gemini-2.5-pro", false));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("google", captor.getValue().getDefaultProvider());
        assertEquals("gemini-2.5-pro", captor.getValue().getDefaultModel());
        assertEquals(false, captor.getValue().isChatPanelEnabled());
        assertEquals("google", response.provider());
        assertEquals("gemini-2.5-pro", response.model());
        assertEquals(false, response.chatPanelEnabled());
    }

    @Test
    void rejectsUnsupportedModelForProvider() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .password("pw")
                .role(Role.USER)
                .build();
        when(currentUserService.requireCurrentUser()).thenReturn(user);
        when(providerCatalogService.getModels(ProviderType.OPENAI)).thenReturn(List.of());

        AiPreferencesService service = new AiPreferencesService(currentUserService, userRepository, providerCatalogService);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.updatePreferences(new UpdateAiPreferencesRequest("openai", "not-supported", true))
        );

        assertEquals(BAD_REQUEST, ex.getStatusCode());
    }
}
