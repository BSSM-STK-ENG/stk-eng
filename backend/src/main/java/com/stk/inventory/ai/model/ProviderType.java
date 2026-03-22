package com.stk.inventory.ai.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ProviderType {
    OPENAI("openai"),
    ANTHROPIC("anthropic"),
    GOOGLE("google");

    private final String value;

    ProviderType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static ProviderType fromValue(String value) {
        for (ProviderType providerType : values()) {
            if (providerType.value.equalsIgnoreCase(value) || providerType.name().equalsIgnoreCase(value)) {
                return providerType;
            }
        }
        throw new IllegalArgumentException("Unsupported provider: " + value);
    }
}
