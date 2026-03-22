package com.stk.inventory.ai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class CredentialCryptoServiceTest {

    private final CredentialCryptoService credentialCryptoService =
            new CredentialCryptoService("4MblI4M0n4tF2e7l3f5x1V8f0GvX9K0+Qm8A2eI2Q6Q=");

    @Test
    void encryptsAndDecryptsApiKey() {
        String apiKey = "sk-test-1234567890";

        CredentialCryptoService.EncryptedPayload encryptedPayload = credentialCryptoService.encrypt(apiKey);
        String decrypted = credentialCryptoService.decrypt(encryptedPayload.encryptedValue(), encryptedPayload.iv());

        assertEquals(apiKey, decrypted);
        assertNotEquals(apiKey, encryptedPayload.encryptedValue());
    }

    @Test
    void masksApiKey() {
        String masked = credentialCryptoService.mask("sk-test-1234567890");
        assertEquals("****...7890", masked);
    }
}
