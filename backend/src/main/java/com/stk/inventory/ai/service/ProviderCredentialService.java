package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.CredentialStatusResponse;
import com.stk.inventory.ai.dto.CredentialConnectionTestResponse;
import com.stk.inventory.ai.entity.ProviderCredential;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.ai.repository.ProviderCredentialRepository;
import com.stk.inventory.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class ProviderCredentialService {

    private final ProviderCredentialRepository credentialRepository;
    private final CredentialCryptoService credentialCryptoService;
    private final ProviderConnectionService providerConnectionService;

    public ProviderCredentialService(ProviderCredentialRepository credentialRepository,
                                     CredentialCryptoService credentialCryptoService,
                                     ProviderConnectionService providerConnectionService) {
        this.credentialRepository = credentialRepository;
        this.credentialCryptoService = credentialCryptoService;
        this.providerConnectionService = providerConnectionService;
    }

    public List<CredentialStatusResponse> getCredentialStatuses(User user) {
        return Arrays.stream(ProviderType.values())
                .map(provider -> credentialRepository.findByUserAndProvider(user, provider)
                        .map(this::toResponse)
                        .orElseGet(() -> new CredentialStatusResponse(provider.value(), false, null, "missing", null, "unknown", null, null)))
                .toList();
    }

    @Transactional
    public CredentialStatusResponse upsert(User user, ProviderType provider, String apiKey, String model) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "API key is required");
        }

        CredentialConnectionTestResponse connectionTest = providerConnectionService.testConnection(provider, apiKey, model);
        CredentialCryptoService.EncryptedPayload encryptedPayload = credentialCryptoService.encrypt(apiKey.trim());
        ProviderCredential credential = credentialRepository.findByUserAndProvider(user, provider)
                .orElseGet(() -> ProviderCredential.builder().user(user).provider(provider).build());

        credential.setEncryptedApiKey(encryptedPayload.encryptedValue());
        credential.setKeyIv(encryptedPayload.iv());
        credential.setMaskedValue(credentialCryptoService.mask(apiKey));
        credential.setValidationStatus("success");
        credential.setValidationMessage(connectionTest.message());
        credential.setValidatedAt(connectionTest.checkedAt());

        ProviderCredential saved = credentialRepository.save(credential);
        return toResponse(saved);
    }

    public CredentialConnectionTestResponse testConnection(ProviderType provider, String apiKey, String model) {
        return providerConnectionService.testConnection(provider, apiKey, model);
    }

    @Transactional
    public void delete(User user, ProviderType provider) {
        credentialRepository.deleteByUserAndProvider(user, provider);
    }

    public String requireApiKey(User user, ProviderType provider) {
        ProviderCredential credential = credentialRepository.findByUserAndProvider(user, provider)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, provider.name() + " API key is not configured"));
        return credentialCryptoService.decrypt(credential.getEncryptedApiKey(), credential.getKeyIv());
    }

    private CredentialStatusResponse toResponse(ProviderCredential credential) {
        String validationStatus = credential.getValidationStatus() == null || credential.getValidationStatus().isBlank()
                ? "unknown"
                : credential.getValidationStatus();

        String status = switch (validationStatus) {
            case "success" -> "verified";
            case "failed" -> "error";
            default -> "saved";
        };

        return new CredentialStatusResponse(
                credential.getProvider().value(),
                true,
                credential.getMaskedValue(),
                status,
                credential.getUpdatedAt(),
                validationStatus,
                credential.getValidationMessage(),
                credential.getValidatedAt()
        );
    }
}
