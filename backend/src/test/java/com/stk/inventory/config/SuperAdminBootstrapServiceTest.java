package com.stk.inventory.config;

import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SuperAdminBootstrapServiceTest {

    @Test
    void createsConfiguredSuperAdminWhenMissing() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(userRepository.findByEmail("superadmin@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("ChangeMe123!")).thenReturn("encoded-password");

        SuperAdminBootstrapService service = new SuperAdminBootstrapService(
                userRepository,
                passwordEncoder,
                true,
                "superadmin@test.com",
                "ChangeMe123!"
        );

        service.run(new DefaultApplicationArguments(new String[]{}));

        verify(userRepository).save(any(User.class));
        verify(userRepository).save(argThat(user ->
                user.getRole() == Role.SUPER_ADMIN
                        && user.isPasswordChangeRequired()
                        && "superadmin@test.com".equals(user.getEmail())
        ));
    }
}
