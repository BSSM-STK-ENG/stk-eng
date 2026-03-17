package com.stk.inventory.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private String email;
    private String message;
}
