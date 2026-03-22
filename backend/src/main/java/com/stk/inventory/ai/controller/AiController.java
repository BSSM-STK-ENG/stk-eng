package com.stk.inventory.ai.controller;

import com.stk.inventory.ai.dto.*;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.ai.service.AiChatOrchestrationService;
import com.stk.inventory.ai.service.AiCurrentUserService;
import com.stk.inventory.ai.service.AiPreferencesService;
import com.stk.inventory.ai.service.ProviderCatalogService;
import com.stk.inventory.ai.service.ProviderCredentialService;
import com.stk.inventory.entity.User;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final ProviderCatalogService providerCatalogService;
    private final ProviderCredentialService providerCredentialService;
    private final AiPreferencesService aiPreferencesService;
    private final AiCurrentUserService currentUserService;
    private final AiChatOrchestrationService aiChatOrchestrationService;

    public AiController(ProviderCatalogService providerCatalogService,
                        ProviderCredentialService providerCredentialService,
                        AiPreferencesService aiPreferencesService,
                        AiCurrentUserService currentUserService,
                        AiChatOrchestrationService aiChatOrchestrationService) {
        this.providerCatalogService = providerCatalogService;
        this.providerCredentialService = providerCredentialService;
        this.aiPreferencesService = aiPreferencesService;
        this.currentUserService = currentUserService;
        this.aiChatOrchestrationService = aiChatOrchestrationService;
    }

    @GetMapping("/providers")
    public ResponseEntity<List<ProviderDescriptorResponse>> getProviders() {
        return ResponseEntity.ok(providerCatalogService.getProviders());
    }

    @GetMapping("/models")
    public ResponseEntity<List<ModelDescriptorResponse>> getModels(@RequestParam String provider) {
        return ResponseEntity.ok(providerCatalogService.getModels(ProviderType.fromValue(provider)));
    }

    @GetMapping("/credentials")
    public ResponseEntity<List<CredentialStatusResponse>> getCredentialStatuses() {
        User user = currentUserService.requireCurrentUser();
        return ResponseEntity.ok(providerCredentialService.getCredentialStatuses(user));
    }

    @PutMapping("/credentials/{provider}")
    public ResponseEntity<CredentialStatusResponse> upsertCredential(@PathVariable String provider,
                                                                     @Valid @RequestBody SaveCredentialRequest request) {
        try {
            User user = currentUserService.requireCurrentUser();
            return ResponseEntity.ok(providerCredentialService.upsert(user, ProviderType.fromValue(provider), request.apiKey(), request.model()));
        } catch (ResponseStatusException ex) {
            log.warn("Credential save failed provider={} status={} reason={}", provider, ex.getStatusCode(), ex.getReason());
            throw ex;
        }
    }

    @PostMapping("/credentials/{provider}/test")
    public ResponseEntity<CredentialConnectionTestResponse> testCredential(@PathVariable String provider,
                                                                           @Valid @RequestBody SaveCredentialRequest request) {
        try {
            return ResponseEntity.ok(
                    providerCredentialService.testConnection(ProviderType.fromValue(provider), request.apiKey(), request.model())
            );
        } catch (ResponseStatusException ex) {
            log.warn("Credential test failed provider={} status={} reason={}", provider, ex.getStatusCode(), ex.getReason());
            throw ex;
        }
    }

    @DeleteMapping("/credentials/{provider}")
    public ResponseEntity<Map<String, String>> deleteCredential(@PathVariable String provider) {
        User user = currentUserService.requireCurrentUser();
        providerCredentialService.delete(user, ProviderType.fromValue(provider));
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @GetMapping("/preferences")
    public ResponseEntity<AiPreferencesResponse> getPreferences() {
        return ResponseEntity.ok(aiPreferencesService.getPreferences());
    }

    @PutMapping("/preferences")
    public ResponseEntity<AiPreferencesResponse> updatePreferences(@Valid @RequestBody UpdateAiPreferencesRequest request) {
        try {
            return ResponseEntity.ok(aiPreferencesService.updatePreferences(request));
        } catch (ResponseStatusException ex) {
            log.warn("AI preferences update failed provider={} status={} reason={}",
                    request.provider(),
                    ex.getStatusCode(),
                    ex.getReason());
            throw ex;
        }
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessions() {
        return ResponseEntity.ok(aiChatOrchestrationService.getSessions());
    }

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(@Valid @RequestBody CreateSessionRequest request) {
        return ResponseEntity.ok(aiChatOrchestrationService.createSession(request));
    }

    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(@PathVariable("id") java.util.UUID sessionId) {
        return ResponseEntity.ok(aiChatOrchestrationService.getMessages(sessionId));
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        try {
            return ResponseEntity.ok(aiChatOrchestrationService.chat(request));
        } catch (ResponseStatusException ex) {
            log.warn("AI chat failed provider={} status={} reason={}",
                    request.provider(),
                    ex.getStatusCode(),
                    ex.getReason());
            throw ex;
        }
    }
}
