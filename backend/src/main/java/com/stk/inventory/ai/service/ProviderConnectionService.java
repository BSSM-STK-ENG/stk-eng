package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.CredentialConnectionTestResponse;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ProviderType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class ProviderConnectionService {
    private static final int MAX_TRANSIENT_RETRIES = 2;

    private final ProviderCatalogService providerCatalogService;
    private final Map<ProviderType, LlmProviderClient> clients;

    public ProviderConnectionService(ProviderCatalogService providerCatalogService,
                                     List<LlmProviderClient> llmProviderClients) {
        this.providerCatalogService = providerCatalogService;
        this.clients = llmProviderClients.stream()
                .collect(HashMap::new, (map, client) -> map.put(client.providerType(), client), HashMap::putAll);
    }

    public CredentialConnectionTestResponse testConnection(ProviderType provider, String apiKey, String model) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "API key is required");
        }
        if (model == null || model.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Model is required");
        }

        validateModel(provider, model);

        LlmProviderClient client = clients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Unsupported provider");
        }

        for (int attempt = 1; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
            try {
                client.complete(
                        apiKey.trim(),
                        model.trim(),
                        List.of(new AiPromptMessage("user", "Reply with OK."))
                );
                break;
            } catch (ResponseStatusException ex) {
                boolean lastAttempt = attempt == MAX_TRANSIENT_RETRIES;
                if (lastAttempt || !isTransientFailure(ex.getReason())) {
                    throw new ResponseStatusException(BAD_GATEWAY, toUserFriendlyMessage(ex.getReason()), ex);
                }
                pauseBeforeRetry();
            }
        }

        return new CredentialConnectionTestResponse(
                true,
                provider.value(),
                model.trim(),
                "연결 확인에 성공했습니다.",
                LocalDateTime.now()
        );
    }

    private void validateModel(ProviderType provider, String model) {
        boolean supported = providerCatalogService.getModels(provider).stream()
                .anyMatch(descriptor -> descriptor.id().equals(model.trim()));
        if (!supported) {
            throw new ResponseStatusException(BAD_REQUEST, "Unsupported model for provider");
        }
    }

    private String toUserFriendlyMessage(String reason) {
        if (reason == null || reason.isBlank()) {
            return "외부 AI 연결 확인에 실패했습니다.";
        }

        String normalized = reason.toLowerCase();
        if (isTransientFailure(normalized)) {
            return "외부 AI 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도하세요.";
        }
        if (normalized.contains("unauthorized")
                || normalized.contains("authentication")
                || normalized.contains("api key")
                || normalized.contains("invalid api key")
                || normalized.contains("forbidden")
                || normalized.contains("permission")) {
            return "API 키가 유효하지 않거나 권한이 없습니다.";
        }
        if (normalized.contains("model")) {
            return "선택한 모델에 접근할 수 없습니다.";
        }
        if (normalized.contains("rate") || normalized.contains("quota")) {
            return "요청 한도에 걸렸습니다. 잠시 후 다시 시도하세요.";
        }
        return "외부 AI 연결 확인에 실패했습니다. " + reason;
    }

    private boolean isTransientFailure(String reason) {
        if (reason == null || reason.isBlank()) {
            return false;
        }

        String normalized = reason.toLowerCase();
        return normalized.contains("timeout")
                || normalized.contains("timed out")
                || normalized.contains("temporar")
                || normalized.contains("overloaded")
                || normalized.contains("service unavailable")
                || normalized.contains("internal server error")
                || normalized.contains("server error")
                || normalized.contains("bad gateway")
                || normalized.contains("try again")
                || normalized.contains("provider request failed")
                || normalized.contains("connection reset")
                || normalized.contains("502")
                || normalized.contains("503")
                || normalized.contains("504")
                || normalized.contains("529");
    }

    private void pauseBeforeRetry() {
        try {
            Thread.sleep(250L);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(BAD_GATEWAY, "외부 AI 연결 확인에 실패했습니다.", interruptedException);
        }
    }
}
