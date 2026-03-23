package com.stk.inventory.controller;

import com.stk.inventory.dto.AuthRequest;
import com.stk.inventory.dto.AuthResponse;
import com.stk.inventory.dto.PasswordSetupRequest;
import com.stk.inventory.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordSetupRequest request) {
        authService.completePasswordSetup(request);
        return ResponseEntity.noContent().build();
    }
}
