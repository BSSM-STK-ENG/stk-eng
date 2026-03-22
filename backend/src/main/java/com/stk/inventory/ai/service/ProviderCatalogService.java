package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.ModelDescriptorResponse;
import com.stk.inventory.ai.dto.ProviderDescriptorResponse;
import com.stk.inventory.ai.model.ProviderType;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class ProviderCatalogService {

    private final Map<ProviderType, ProviderDescriptorResponse> providerCatalog = new EnumMap<>(ProviderType.class);
    private final Map<ProviderType, List<ModelDescriptorResponse>> modelCatalog = new EnumMap<>(ProviderType.class);

    public ProviderCatalogService() {
        providerCatalog.put(ProviderType.OPENAI, new ProviderDescriptorResponse("openai", "ChatGPT / OpenAI", "OpenAI responses API"));
        providerCatalog.put(ProviderType.ANTHROPIC, new ProviderDescriptorResponse("anthropic", "Claude / Anthropic", "Anthropic messages API"));
        providerCatalog.put(ProviderType.GOOGLE, new ProviderDescriptorResponse("google", "Gemini / Google", "Google Gemini generateContent API"));

        modelCatalog.put(ProviderType.OPENAI, List.of(
                new ModelDescriptorResponse("gpt-5", "GPT-5", "openai", "flagship"),
                new ModelDescriptorResponse("gpt-5-mini", "GPT-5 Mini", "openai", "fast"),
                new ModelDescriptorResponse("gpt-4.1-mini", "GPT-4.1 Mini", "openai", "fallback")
        ));
        modelCatalog.put(ProviderType.ANTHROPIC, List.of(
                new ModelDescriptorResponse("claude-sonnet-4-5", "Claude Sonnet 4.5", "anthropic", "flagship"),
                new ModelDescriptorResponse("claude-3-7-sonnet-latest", "Claude 3.7 Sonnet", "anthropic", "balanced"),
                new ModelDescriptorResponse("claude-3-5-haiku-latest", "Claude 3.5 Haiku", "anthropic", "fast")
        ));
        modelCatalog.put(ProviderType.GOOGLE, List.of(
                new ModelDescriptorResponse("gemini-2.5-pro", "Gemini 2.5 Pro", "google", "flagship"),
                new ModelDescriptorResponse("gemini-2.5-flash", "Gemini 2.5 Flash", "google", "fast"),
                new ModelDescriptorResponse("gemini-2.0-flash", "Gemini 2.0 Flash", "google", "fallback")
        ));
    }

    public List<ProviderDescriptorResponse> getProviders() {
        return List.copyOf(providerCatalog.values());
    }

    public List<ModelDescriptorResponse> getModels(ProviderType providerType) {
        return modelCatalog.getOrDefault(providerType, List.of());
    }

    public ProviderDescriptorResponse getDefaultProvider() {
        return getProviders().stream().findFirst().orElseThrow();
    }

    public ModelDescriptorResponse getDefaultModel(ProviderType providerType) {
        return getModels(providerType).stream().findFirst().orElseThrow();
    }
}
