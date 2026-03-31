package com.stk.inventory.service;

import com.stk.inventory.dto.UserOptionResponse;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserDirectoryService {

    private final UserRepository userRepository;

    public UserDirectoryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserOptionResponse> listManagerOptions() {
        return userRepository.findAllByEmailVerifiedTrueOrderByNameAsc().stream()
                .filter(user -> user.getName() != null && !user.getName().trim().isBlank())
                .map(user -> UserOptionResponse.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                .toList();
    }

    public String requireRegisteredManagerNameByUserId(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("담당자를 선택해주세요.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("등록된 사용자만 담당자로 선택할 수 있습니다."));
        return normalizeRegisteredManager(user);
    }

    public String requireRegisteredManagerName(String managerName) {
        String normalizedName = normalizeName(managerName);
        return userRepository.findByNameIgnoreCase(normalizedName)
                .map(this::normalizeRegisteredManager)
                .orElseThrow(() -> new IllegalArgumentException("등록된 사용자 이름만 담당자로 선택할 수 있습니다."));
    }

    private String normalizeRegisteredManager(User user) {
        if (!user.isEmailVerified()) {
            throw new IllegalArgumentException("이메일 인증이 완료된 사용자만 담당자로 선택할 수 있습니다.");
        }
        String normalizedName = normalizeName(user.getName());
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("이름이 설정된 사용자만 담당자로 선택할 수 있습니다.");
        }
        return normalizedName;
    }

    private String normalizeName(String value) {
        String normalizedName = value == null ? "" : value.trim();
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("담당자를 선택해주세요.");
        }
        return normalizedName;
    }
}
