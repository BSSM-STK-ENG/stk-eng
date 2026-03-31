package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.CredentialConnectionTestResponse;
import com.stk.inventory.ai.dto.ModelDescriptorResponse;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderCompletion;
import com.stk.inventory.ai.model.ProviderType;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.http.HttpStatus.BAD_GATEWAY;

class ProviderConnectionServiceTest {

    @Test
    void retriesTransientProviderErrorsBeforeFailing() {
        ProviderCatalogService providerCatalogService = new ProviderCatalogService() {
            @Override
            public List<ModelDescriptorResponse> getModels(ProviderType providerType) {
                return List.of(new ModelDescriptorResponse("gpt-5", "GPT-5", "openai", "flagship"));
            }
        };

        AtomicInteger calls = new AtomicInteger();
        LlmProviderClient flakyClient = new LlmProviderClient() {
            @Override
            public ProviderType providerType() {
                return ProviderType.OPENAI;
            }

            @Override
            public ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages) {
                if (calls.getAndIncrement() == 0) {
                    throw new ResponseStatusException(BAD_GATEWAY, "Service unavailable");
                }
                return new ProviderCompletion("OK", "{}");
            }
        };

        ProviderConnectionService service = new ProviderConnectionService(providerCatalogService, List.of(flakyClient));

        CredentialConnectionTestResponse response = service.testConnection(ProviderType.OPENAI, "sk-test", "gpt-5");

        assertEquals(true, response.success());
        assertEquals(2, calls.get());
    }

    @Test
    void doesNotRetryInvalidCredentialErrors() {
        ProviderCatalogService providerCatalogService = new ProviderCatalogService() {
            @Override
            public List<ModelDescriptorResponse> getModels(ProviderType providerType) {
                return List.of(new ModelDescriptorResponse("gpt-5", "GPT-5", "openai", "flagship"));
            }
        };

        AtomicInteger calls = new AtomicInteger();
        LlmProviderClient invalidKeyClient = new LlmProviderClient() {
            @Override
            public ProviderType providerType() {
                return ProviderType.OPENAI;
            }

            @Override
            public ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages) {
                calls.incrementAndGet();
                throw new ResponseStatusException(BAD_GATEWAY, "Invalid API key");
            }
        };

        ProviderConnectionService service = new ProviderConnectionService(providerCatalogService, List.of(invalidKeyClient));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.testConnection(ProviderType.OPENAI, "sk-test", "gpt-5")
        );

        assertEquals(BAD_GATEWAY, exception.getStatusCode());
        assertEquals("API 키가 유효하지 않거나 권한이 없습니다.", exception.getReason());
        assertEquals(1, calls.get());
    }
}
