package com.stk.inventory.service;

import com.stk.inventory.dto.AdminCreateUserRequest;
import com.stk.inventory.dto.AdminCreatePermissionPresetRequest;
import com.stk.inventory.dto.AdminUpdateUserPermissionsRequest;
import com.stk.inventory.dto.AdminUpdateUserRoleRequest;
import com.stk.inventory.entity.CustomPermissionPreset;
import com.stk.inventory.entity.PagePermission;
import com.stk.inventory.entity.PermissionPreset;
import com.stk.inventory.entity.Role;
import com.stk.inventory.entity.User;
import com.stk.inventory.repository.CustomPermissionPresetRepository;
import com.stk.inventory.repository.CustomRoleProfileRepository;
import com.stk.inventory.gateway.UserGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import com.stk.inventory.mapper.UserMapper;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserManagementServiceTest {

    private UserPermissionService userPermissionService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserGateway userGateway;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CustomPermissionPresetRepository customPermissionPresetRepository;

    @Mock
    private CustomRoleProfileRepository customRoleProfileRepository;

    @Mock
    private com.stk.inventory.service.TemporaryPasswordGenerator temporaryPasswordGenerator;

    @BeforeEach
    void setUpPermissionService() {
        userPermissionService = new UserPermissionService(customPermissionPresetRepository, customRoleProfileRepository);
    }

    @Test
    void superAdminCanIssueManagedAccount() {
        when(temporaryPasswordGenerator.generate()).thenReturn("tmp-pass");
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.existsByEmail("issued@test.com")).thenReturn(false);
        when(passwordEncoder.encode("tmp-pass")).thenReturn("encoded-temp-password");
        when(userGateway.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });

        AdminCreateUserRequest request = new AdminCreateUserRequest();
        request.setName("신규담당");
        request.setEmail("issued@test.com");
        request.setRole(Role.ADMIN);
        request.setPermissionPreset(PermissionPreset.OPERATOR.getKey());

        var response = service.createUser(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userGateway).save(captor.capture());
        assertEquals("신규담당", captor.getValue().getName());
        assertEquals(Role.ADMIN, captor.getValue().getRole());
        assertEquals(PermissionPreset.OPERATOR.getKey(), captor.getValue().getPermissionPreset());
        assertFalse(captor.getValue().isChatPanelEnabled());
        assertTrue(captor.getValue().isPasswordChangeRequired());
        assertEquals("issued@test.com", response.getEmail());
        assertEquals("신규담당", response.getName());
        assertEquals(Role.ADMIN, response.getRole());
        assertTrue(response.isPasswordChangeRequired());
        assertEquals("tmp-pass", response.getTemporaryPassword());
    }

    @Test
    void nonSuperAdminCannotManageAccounts() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin@test.com", "token")
        );
        when(userGateway.findByEmail("admin@test.com")).thenReturn(Optional.of(User.builder()
                .email("admin@test.com")
                .role(Role.ADMIN)
                .password("encoded")
                .build()));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, service::listUsers);
        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void superAdminCanUpdateIssuedUserRole() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.USER)
                .password("encoded-user")
                .build()));
        when(userGateway.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminUpdateUserRoleRequest request = new AdminUpdateUserRoleRequest();
        request.setRole(Role.ADMIN);

        var response = service.updateUserRole(userId, request);

        assertEquals(Role.ADMIN, response.getRole());
        verify(userGateway).save(argThat(saved -> saved.getId().equals(userId) && saved.getRole() == Role.ADMIN));
    }

    @Test
    void superAdminCanUpdatePagePermissionsWithPreset() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.USER)
                .permissionPreset(PermissionPreset.VIEWER.getKey())
                .pagePermissions(userPermissionService.serialize(PermissionPreset.VIEWER.getPermissions()))
                .password("encoded-user")
                .build()));
        when(userGateway.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminUpdateUserPermissionsRequest request = new AdminUpdateUserPermissionsRequest();
        request.setPermissionPreset(PermissionPreset.MANAGER.getKey());
        request.setPagePermissions(java.util.List.of(
                PagePermission.DASHBOARD.getKey(),
                PagePermission.CURRENT_STOCK.getKey(),
                PagePermission.STOCK_LEDGER.getKey(),
                PagePermission.HISTORY.getKey(),
                PagePermission.INBOUND.getKey(),
                PagePermission.OUTBOUND.getKey(),
                PagePermission.CLOSING.getKey(),
                PagePermission.MASTER_DATA.getKey()
        ));

        var response = service.updateUserPermissions(userId, request);

        assertEquals(PermissionPreset.MANAGER.getKey(), response.getPermissionPreset());
        assertTrue(response.getPagePermissions().contains(PagePermission.CLOSING.getKey()));
        verify(userGateway).save(argThat(saved ->
                saved.getId().equals(userId)
                        && PermissionPreset.MANAGER.getKey().equals(saved.getPermissionPreset())
                        && saved.getPagePermissions().contains(PagePermission.MASTER_DATA.getKey())
        ));
    }

    @Test
    void permissionOptionsExposePresetsAndPageList() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));

        var response = service.getPermissionOptions();

        assertFalse(response.getPresets().isEmpty());
        assertFalse(response.getPages().isEmpty());
        assertTrue(response.getPresets().stream().anyMatch(preset -> PermissionPreset.OPERATOR.getKey().equals(preset.getKey())));
        assertTrue(response.getPages().stream().anyMatch(page -> PagePermission.CURRENT_STOCK.getKey().equals(page.getKey())));
    }

    @Test
    void superAdminCanCreateCustomPermissionPreset() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(customPermissionPresetRepository.existsByLabelIgnoreCase("현장 조회 + 출고")).thenReturn(false);
        when(customPermissionPresetRepository.save(any(CustomPermissionPreset.class))).thenAnswer(invocation -> {
            CustomPermissionPreset preset = invocation.getArgument(0);
            preset.setId(1L);
            return preset;
        });

        AdminCreatePermissionPresetRequest request = new AdminCreatePermissionPresetRequest();
        request.setLabel("현장 조회 + 출고");
        request.setDescription("조회 화면과 출고만 허용");
        request.setPagePermissions(java.util.List.of(
                PagePermission.DASHBOARD.getKey(),
                PagePermission.CURRENT_STOCK.getKey(),
                PagePermission.STOCK_LEDGER.getKey(),
                PagePermission.OUTBOUND.getKey()
        ));

        var response = service.createPermissionPreset(request);

        assertFalse(response.isSystemPreset());
        assertEquals("현장 조회 + 출고", response.getLabel());
        assertTrue(response.getPagePermissions().contains(PagePermission.OUTBOUND.getKey()));
        verify(customPermissionPresetRepository).save(argThat(saved ->
                "현장 조회 + 출고".equals(saved.getLabel()) && saved.getPagePermissions().contains(PagePermission.OUTBOUND.getKey())
        ));
    }

    @Test
    void cannotDeleteCustomPresetWhenAnyUserUsesIt() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.existsByPermissionPreset("CUSTOM_TEST")).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.deletePermissionPreset("CUSTOM_TEST"));

        assertEquals(409, exception.getStatusCode().value());
        verify(customPermissionPresetRepository, never()).delete(any(CustomPermissionPreset.class));
    }

    @Test
    void superAdminCanResetIssuedUserPassword() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.ADMIN)
                .password("encoded-user")
                .passwordChangeRequired(false)
                .build()));
        when(passwordEncoder.encode("tmp-pass")).thenReturn("reset-encoded");
        when(userGateway.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.resetUserPassword(userId);

        assertEquals("user@test.com", response.getEmail());
        assertEquals("tmp-pass", response.getTemporaryPassword());
        assertTrue(response.isPasswordChangeRequired());
        verify(userGateway).save(argThat(saved ->
                saved.getId().equals(userId)
                        && saved.isPasswordChangeRequired()
                        && "reset-encoded".equals(saved.getPassword())
        ));
    }

    @Test
    void superAdminCanUpdateIssuedUserName() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.USER)
                .password("encoded-user")
                .build()));
        when(userGateway.existsByNameIgnoreCaseAndIdNot("김작업", userId)).thenReturn(false);
        when(userGateway.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var request = new com.stk.inventory.dto.AdminUpdateUserNameRequest();
        request.setName("김작업");

        var response = service.updateUserName(userId, request);

        assertEquals("김작업", response.getName());
        verify(userGateway).save(argThat(saved -> saved.getId().equals(userId) && "김작업".equals(saved.getName())));
    }

    @Test
    void superAdminCanDeleteUnusedUser() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .id(UUID.randomUUID())
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.USER)
                .password("encoded-user")
                .build()));

        service.deleteUser(userId);

        verify(userGateway).delete(argThat(user -> user.getId().equals(userId)));
        verify(userGateway).flush();
    }

    @Test
    void cannotDeleteReferencedUser() {
        AdminUserManagementService service = new AdminUserManagementService(userGateway, passwordEncoder, userPermissionService, userMapper, temporaryPasswordGenerator);
        UUID userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("superadmin@test.com", "token")
        );

        when(userGateway.findByEmail("superadmin@test.com")).thenReturn(Optional.of(User.builder()
                .id(UUID.randomUUID())
                .email("superadmin@test.com")
                .role(Role.SUPER_ADMIN)
                .password("encoded")
                .build()));
        when(userGateway.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId)
                .email("user@test.com")
                .role(Role.USER)
                .password("encoded-user")
                .build()));
        doThrow(new DataIntegrityViolationException("fk")).when(userGateway).flush();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.deleteUser(userId));

        assertEquals(409, exception.getStatusCode().value());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }
}
