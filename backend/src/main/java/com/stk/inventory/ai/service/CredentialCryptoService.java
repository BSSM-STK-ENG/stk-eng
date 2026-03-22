package com.stk.inventory.ai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class CredentialCryptoService {

    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public CredentialCryptoService(@Value("${app.ai.master-key:4MblI4M0n4tF2e7l3f5x1V8f0GvX9K0+Qm8A2eI2Q6Q=}") String base64MasterKey) {
        byte[] keyBytes = Base64.getDecoder().decode(base64MasterKey);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public EncryptedPayload encrypt(String rawValue) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(rawValue.getBytes(StandardCharsets.UTF_8));

            return new EncryptedPayload(
                    Base64.getEncoder().encodeToString(encrypted),
                    Base64.getEncoder().encodeToString(iv)
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to encrypt provider credential", ex);
        }
    }

    public String decrypt(String encryptedValue, String ivBase64) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    secretKey,
                    new GCMParameterSpec(GCM_TAG_LENGTH, Base64.getDecoder().decode(ivBase64))
            );
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedValue));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to decrypt provider credential", ex);
        }
    }

    public String mask(String rawValue) {
        String trimmed = rawValue.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "****..." + trimmed.substring(trimmed.length() - 4);
    }

    public record EncryptedPayload(String encryptedValue, String iv) {
    }
}
