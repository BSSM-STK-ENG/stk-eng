package com.stk.inventory.ai.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ChatRole {
    USER,
    ASSISTANT;

    @JsonValue
    public String value() {
        return name().toLowerCase();
    }
}
