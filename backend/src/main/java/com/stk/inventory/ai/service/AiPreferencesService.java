package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.AiPreferencesResponse;
import com.stk.inventory.ai.dto.UpdateAiPreferencesRequest;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class AiPreferencesService {

    private final AiCurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final ProviderCatalogService providerCatalogService;

    public AiPreferencesService(AiCurrentUserService currentUserService,
                                UserRepository userRepository,
                                ProviderCatalogService providerCatalogService) {
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.providerCatalogService = providerCatalogService;
    }

    public AiPreferencesResponse getPreferences() {
        User user = currentUserService.requireCurrentUser();
        return toResponse(user);
    }

    @Transactional
    public AiPreferencesResponse updatePreferences(UpdateAiPreferencesRequest request) {
        User user = currentUserService.requireCurrentUser();
        ProviderType providerType;
        try {
            providerType = ProviderType.fromValue(request.provider());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Unsupported provider", ex);
        }
        String model = request.model().trim();

        validateModel(providerType, model);

        user.setDefaultProvider(providerType.value());
        user.setDefaultModel(model);
        if (request.chatPanelEnabled() != null) {
            user.setChatPanelEnabled(request.chatPanelEnabled());
        }
        return toResponse(userRepository.save(user));
    }

    private void validateModel(ProviderType providerType, String model) {
        boolean match = providerCatalogService.getModels(providerType).stream()
                .anyMatch(descriptor -> Objects.equals(descriptor.id(), model));
        if (!match) {
            throw new ResponseStatusException(BAD_REQUEST, "Unsupported model for provider");
        }
    }

    private AiPreferencesResponse toResponse(User user) {
        String defaultProvider = user.getDefaultProvider();
        if (defaultProvider == null || defaultProvider.isBlank()) {
            defaultProvider = providerCatalogService.getDefaultProvider().provider();
        }

        ProviderType providerType = resolveProviderType(defaultProvider);
        String defaultModel = user.getDefaultModel();
        if (defaultModel == null || defaultModel.isBlank() || !isModelSupported(providerType, defaultModel)) {
            defaultModel = providerCatalogService.getDefaultModel(providerType).id();
        }

        return new AiPreferencesResponse(defaultProvider, defaultModel, user.isChatPanelEnabled());
    }

    private ProviderType resolveProviderType(String provider) {
        try {
            return ProviderType.fromValue(provider);
        } catch (IllegalArgumentException ex) {
            return ProviderType.fromValue(providerCatalogService.getDefaultProvider().provider());
        }
    }

    private boolean isModelSupported(ProviderType providerType, String model) {
        return providerCatalogService.getModels(providerType).stream()
                .anyMatch(descriptor -> Objects.equals(descriptor.id(), model));
    }
}
