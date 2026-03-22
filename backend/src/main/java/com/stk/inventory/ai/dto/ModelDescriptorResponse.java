package com.stk.inventory.ai.dto;

public record ModelDescriptorResponse(
        String id,
        String name,
        String provider,
        String description
) {
}
