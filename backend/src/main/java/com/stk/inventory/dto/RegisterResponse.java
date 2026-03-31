package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RegisterResponse {
    String email;
    String message;
}
