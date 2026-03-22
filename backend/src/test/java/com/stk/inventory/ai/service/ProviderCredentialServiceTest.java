package com.stk.inventory.ai.service;

import com.stk.inventory.ai.dto.CredentialConnectionTestResponse;
import com.stk.inventory.ai.dto.CredentialStatusResponse;
import com.stk.inventory.ai.entity.ProviderCredential;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.ai.repository.ProviderCredentialRepository;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderCredentialServiceTest {

    @Mock
    private ProviderCredentialRepository credentialRepository;

    @Mock
    private CredentialCryptoService credentialCryptoService;

    @Mock
    private ProviderConnectionService providerConnectionService;

    @InjectMocks
    private ProviderCredentialService providerCredentialService;

    @Test
    void validatesConnectionBeforeSavingCredential() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("tester@example.com")
                .password("pw")
                .role(Role.USER)
                .build();

        LocalDateTime checkedAt = LocalDateTime.of(2026, 3, 23, 0, 30);
        when(providerConnectionService.testConnection(eq(ProviderType.OPENAI), eq("sk-test-1234567890"), eq("gpt-5")))
                .thenReturn(new CredentialConnectionTestResponse(true, "openai", "gpt-5", "연결 확인에 성공했습니다.", checkedAt));
        when(credentialCryptoService.encrypt("sk-test-1234567890"))
                .thenReturn(new CredentialCryptoService.EncryptedPayload("encrypted", "iv"));
        when(credentialCryptoService.mask("sk-test-1234567890"))
                .thenReturn("****...7890");
        when(credentialRepository.findByUserAndProvider(user, ProviderType.OPENAI))
                .thenReturn(Optional.empty());
        when(credentialRepository.save(any(ProviderCredential.class)))
                .thenAnswer(invocation -> {
                    ProviderCredential credential = invocation.getArgument(0);
                    credential.setUpdatedAt(checkedAt);
                    return credential;
                });

        CredentialStatusResponse response = providerCredentialService.upsert(user, ProviderType.OPENAI, "sk-test-1234567890", "gpt-5");

        ArgumentCaptor<ProviderCredential> captor = ArgumentCaptor.forClass(ProviderCredential.class);
        verify(credentialRepository).save(captor.capture());
        ProviderCredential saved = captor.getValue();

        assertEquals("****...7890", saved.getMaskedValue());
        assertEquals("success", saved.getValidationStatus());
        assertEquals("연결 확인에 성공했습니다.", saved.getValidationMessage());
        assertEquals(checkedAt, saved.getValidatedAt());

        assertTrue(response.hasKey());
        assertEquals("verified", response.status());
        assertEquals("success", response.validationStatus());
        assertEquals("연결 확인에 성공했습니다.", response.validationMessage());
    }
}
