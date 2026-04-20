package com.stk.inventory.config;

import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class SuperAdminBootstrapService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminBootstrapService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String email;
    private final String name;
    private final String password;

    public SuperAdminBootstrapService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.super-admin.enabled:true}") boolean enabled,
            @Value("${app.bootstrap.super-admin.email:}") String email,
            @Value("${app.bootstrap.super-admin.name:슈퍼 어드민}") String name,
            @Value("${app.bootstrap.super-admin.password:}") String password
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.email = email;
        this.name = name;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled || email == null || email.trim().isEmpty() || password == null || password.isBlank()) {
            return;
        }

        userRepository.findByEmail(email.trim()).ifPresentOrElse(existingUser -> {
            boolean updated = false;
            if (existingUser.getRole() != Role.SUPER_ADMIN) {
                existingUser.setRole(Role.SUPER_ADMIN);
                updated = true;
            }
            if (existingUser.isPasswordChangeRequired()) {
                existingUser.setPasswordChangeRequired(false);
                updated = true;
            }
            if (!existingUser.isEmailVerified()) {
                existingUser.setEmailVerified(true);
                existingUser.setEmailVerificationToken(null);
                existingUser.setEmailVerificationExpiresAt(null);
                updated = true;
            }
            if (existingUser.getName() == null || existingUser.getName().trim().isBlank()) {
                existingUser.setName(name);
                updated = true;
            }
            if (updated) {
                userRepository.save(existingUser);
                log.info("Ensured configured super admin account is ready: {}", existingUser.getEmail());
            }
        }, () -> {
            try {
                userRepository.save(User.builder()
                        .name(name)
                        .email(email.trim())
                        .password(passwordEncoder.encode(password))
                        .role(Role.SUPER_ADMIN)
                        .chatPanelEnabled(false)
                        .passwordChangeRequired(false)
                        .emailVerified(true)
                        .build());
                log.info("Bootstrapped super admin account: {}", email.trim());
            } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                log.warn("Bootstrapping super admin failed due to constraint, attempting to reconcile: {}", ex.getMessage());
                userRepository.findByEmail(email.trim()).ifPresentOrElse(user -> {
                    boolean updated = false;
                    if (user.getRole() != Role.SUPER_ADMIN) {
                        user.setRole(Role.SUPER_ADMIN);
                        updated = true;
                    }
                    if (user.isPasswordChangeRequired()) {
                        user.setPasswordChangeRequired(false);
                        updated = true;
                    }
                    if (!user.isEmailVerified()) {
                        user.setEmailVerified(true);
                        user.setEmailVerificationToken(null);
                        user.setEmailVerificationExpiresAt(null);
                        updated = true;
                    }
                    if (user.getName() == null || user.getName().trim().isBlank()) {
                        user.setName(name);
                        updated = true;
                    }
                    if (updated) {
                        userRepository.save(user);
                        log.info("Recovered super admin account after constraint violation: {}", user.getEmail());
                    } else {
                        log.info("Super admin account exists and appears correct: {}", user.getEmail());
                    }
                }, () -> log.error("Failed to bootstrap super admin and could not find existing user with email {}", email.trim()));
            }
        });
    }
}
