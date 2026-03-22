package com.stk.inventory.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderCompletion;
import com.stk.inventory.ai.model.ProviderType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpRequest;
import java.util.List;
import java.util.Map;

@Service
public class AnthropicClient extends AbstractJsonHttpProviderClient {

    public AnthropicClient(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public ProviderType providerType() {
        return ProviderType.ANTHROPIC;
    }

    @Override
    public ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages) {
        String system = messages.stream()
                .filter(message -> "system".equals(message.role()))
                .map(AiPromptMessage::content)
                .findFirst()
                .orElse("");

        List<Map<String, Object>> chatMessages = messages.stream()
                .filter(message -> !"system".equals(message.role()))
                .map(message -> {
                    Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("role", "assistant".equals(message.role()) ? "assistant" : "user");
                    map.put("content", message.content());
                    return map;
                })
                .toList();

        String body = toJson(Map.of(
                "model", model,
                "max_tokens", 1200,
                "system", system,
                "messages", chatMessages
        ));

        return postJson(
                URI.create("https://api.anthropic.com/v1/messages"),
                body,
                HttpRequest.newBuilder()
                        .header("x-api-key", apiKey)
                        .header("anthropic-version", "2023-06-01")
        );
    }

    @Override
    protected String extractText(JsonNode responseBody) {
        StringBuilder builder = new StringBuilder();
        JsonNode content = responseBody.path("content");
        if (content.isArray()) {
            for (JsonNode part : content) {
                JsonNode text = part.get("text");
                if (text != null && text.isTextual()) {
                    builder.append(text.asText());
                }
            }
        }
        return builder.toString().trim();
    }
}
