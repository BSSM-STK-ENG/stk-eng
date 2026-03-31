package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class UserOptionResponse {
    UUID id;
    String name;
    String email;
}
