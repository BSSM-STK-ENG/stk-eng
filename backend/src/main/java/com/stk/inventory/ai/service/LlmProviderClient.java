package com.stk.inventory.ai.service;

import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderCompletion;
import com.stk.inventory.ai.model.ProviderType;

import java.util.List;

public interface LlmProviderClient {
    ProviderType providerType();
    ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages);
}
