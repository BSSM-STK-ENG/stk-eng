package com.stk.inventory.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderCompletion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

public abstract class AbstractJsonHttpProviderClient implements LlmProviderClient {

    protected final ObjectMapper objectMapper;
    protected final HttpClient httpClient;

    protected AbstractJsonHttpProviderClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    protected ProviderCompletion postJson(URI uri, String body, HttpRequest.Builder builder) {
        try {
            HttpRequest request = builder
                    .uri(uri)
                    .timeout(Duration.ofSeconds(60))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(BAD_GATEWAY, extractErrorMessage(response.body()));
            }

            JsonNode jsonNode = objectMapper.readTree(response.body());
            return new ProviderCompletion(extractText(jsonNode), response.body());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Provider request failed", ex);
        }
    }

    protected abstract String extractText(JsonNode responseBody);

    protected String extractErrorMessage(String responseBody) {
        try {
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            JsonNode error = jsonNode.path("error");
            if (error.isTextual()) {
                return error.asText();
            }
            if (error.isObject()) {
                JsonNode message = error.path("message");
                if (message.isTextual()) {
                    return message.asText();
                }
            }

            JsonNode message = jsonNode.path("message");
            if (message.isTextual()) {
                return message.asText();
            }
        } catch (Exception ignored) {
            // Fall through to the raw body summary below.
        }

        String normalized = responseBody == null ? "" : responseBody.replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return "Provider request failed";
        }
        return normalized.length() > 240 ? normalized.substring(0, 240) + "..." : normalized;
    }

    protected String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize provider request", ex);
        }
    }

    protected String mergeMessages(List<AiPromptMessage> messages) {
        StringBuilder builder = new StringBuilder();
        for (AiPromptMessage message : messages) {
            builder.append(message.role().toUpperCase()).append(":\n").append(message.content()).append("\n\n");
        }
        return builder.toString().trim();
    }
}
