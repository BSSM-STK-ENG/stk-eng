package com.stk.inventory.config;

import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SuperAdminBootstrapService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminBootstrapService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String email;
    private final String password;

    public SuperAdminBootstrapService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.super-admin.enabled:true}") boolean enabled,
            @Value("${app.bootstrap.super-admin.email:superadmin@stk.local}") String email,
            @Value("${app.bootstrap.super-admin.password:ChangeMe123!}") String password
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled || email == null || email.trim().isEmpty() || password == null || password.isBlank()) {
            return;
        }

        userRepository.findByEmail(email.trim()).ifPresentOrElse(existingUser -> {
            if (existingUser.getRole() != Role.SUPER_ADMIN) {
                existingUser.setRole(Role.SUPER_ADMIN);
                userRepository.save(existingUser);
                log.info("Promoted configured super admin account: {}", existingUser.getEmail());
            }
        }, () -> {
            userRepository.save(User.builder()
                    .email(email.trim())
                    .password(passwordEncoder.encode(password))
                    .role(Role.SUPER_ADMIN)
                    .passwordChangeRequired(true)
                    .build());
            log.info("Bootstrapped super admin account: {}", email.trim());
        });
    }
}
