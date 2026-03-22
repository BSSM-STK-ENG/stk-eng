package com.stk.inventory.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderCompletion;
import com.stk.inventory.ai.model.ProviderType;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpRequest;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiClient extends AbstractJsonHttpProviderClient {

    public OpenAiClient(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public ProviderType providerType() {
        return ProviderType.OPENAI;
    }

    @Override
    public ProviderCompletion complete(String apiKey, String model, List<AiPromptMessage> messages) {
        List<Map<String, Object>> input = messages.stream()
                .map(message -> Map.of(
                        "role", message.role(),
                        "content", List.of(Map.of("type", "input_text", "text", message.content()))
                ))
                .toList();

        String body = toJson(Map.of(
                "model", model,
                "input", input
        ));

        return postJson(
                URI.create("https://api.openai.com/v1/responses"),
                body,
                HttpRequest.newBuilder().header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        );
    }

    @Override
    protected String extractText(JsonNode responseBody) {
        JsonNode outputText = responseBody.get("output_text");
        if (outputText != null && outputText.isTextual()) {
            return outputText.asText();
        }

        StringBuilder builder = new StringBuilder();
        JsonNode output = responseBody.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.path("content");
                if (content.isArray()) {
                    for (JsonNode part : content) {
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
