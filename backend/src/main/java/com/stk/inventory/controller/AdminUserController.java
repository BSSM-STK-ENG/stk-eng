package com.stk.inventory.controller;

import com.stk.inventory.dto.AdminCreateUserRequest;
import com.stk.inventory.dto.AdminCreatedUserResponse;
import com.stk.inventory.dto.AdminUserSummaryResponse;
import com.stk.inventory.service.AdminUserManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserManagementService adminUserManagementService;

    public AdminUserController(AdminUserManagementService adminUserManagementService) {
        this.adminUserManagementService = adminUserManagementService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserSummaryResponse>> listUsers() {
        return ResponseEntity.ok(adminUserManagementService.listUsers());
    }

    @PostMapping
    public ResponseEntity<AdminCreatedUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserManagementService.createUser(request));
    }
}
