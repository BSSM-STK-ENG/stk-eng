package com.stk.inventory.controller;

import com.stk.inventory.dto.UserOptionResponse;
import com.stk.inventory.service.UserDirectoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserDirectoryController {

    private final UserDirectoryService userDirectoryService;

    public UserDirectoryController(UserDirectoryService userDirectoryService) {
        this.userDirectoryService = userDirectoryService;
    }

    @GetMapping("/options")
    public ResponseEntity<List<UserOptionResponse>> listUserOptions() {
        return ResponseEntity.ok(userDirectoryService.listManagerOptions());
    }
}
