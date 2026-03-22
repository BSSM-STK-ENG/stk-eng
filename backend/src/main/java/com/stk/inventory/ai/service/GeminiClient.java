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
public class GeminiClient extends AbstractJsonHttpProviderClient {

    public GeminiClient(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public ProviderType providerType() {
        return ProviderType.GOOGLE;
    }

    @Override
    public ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages) {
        String system = messages.stream()
                .filter(message -> "system".equals(message.role()))
                .map(AiPromptMessage::content)
                .findFirst()
                .orElse("");

        List<Map<String, Object>> contents = messages.stream()
                .filter(message -> !"system".equals(message.role()))
                .map(message -> Map.of(
                        "role", "assistant".equals(message.role()) ? "model" : "user",
                        "parts", List.of(Map.of("text", message.content()))
                ))
                .toList();

        String body = toJson(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
                "contents", contents
        ));

        return postJson(
                URI.create("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s".formatted(model, apiKey)),
                body,
                HttpRequest.newBuilder()
        );
    }

    @Override
    protected String extractText(JsonNode responseBody) {
        StringBuilder builder = new StringBuilder();
        JsonNode candidates = responseBody.path("candidates");
        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                JsonNode parts = candidate.path("content").path("parts");
                if (parts.isArray()) {
                    for (JsonNode part : parts) {
                        JsonNode text = part.get("text");
                        if (text != null && text.isTextual()) {
                            builder.append(text.asText());
                        }
                    }
                }
            }
        }
        return builder.toString().trim();
    }
}
