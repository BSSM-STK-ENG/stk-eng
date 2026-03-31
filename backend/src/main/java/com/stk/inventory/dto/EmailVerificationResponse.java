package com.stk.inventory.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmailVerificationResponse {
    String email;
    String message;
}
