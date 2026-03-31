package com.stk.inventory.controller;

import com.stk.inventory.dto.AuthRequest;
import com.stk.inventory.dto.AuthResponse;
import com.stk.inventory.dto.EmailVerificationResponse;
import com.stk.inventory.dto.RegisterRequest;
import com.stk.inventory.dto.RegisterResponse;
import com.stk.inventory.entity.PermissionPreset;
import com.stk.inventory.entity.Role;
import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import com.stk.inventory.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private PasswordChangeRequiredFilter passwordChangeRequiredFilter;

    @BeforeEach
    void setUp() {
        AuthResponse response = new AuthResponse();
        response.setToken("mock-jwt-token");
        response.setName("테스트 사용자");
        response.setEmail("test@test.com");
        response.setRole(Role.SUPER_ADMIN);
        response.setPermissionPreset(PermissionPreset.MANAGER.getKey());
        response.setPagePermissions(java.util.List.of("DASHBOARD", "CURRENT_STOCK"));
        response.setPasswordChangeRequired(true);
        response.setMessage("Success");

        Mockito.when(authService.login(any(AuthRequest.class))).thenReturn(response);
        Mockito.when(authService.register(any(RegisterRequest.class))).thenReturn(RegisterResponse.builder()
                .email("new@test.com")
                .message("인증 메일을 보냈습니다.")
                .build());
        Mockito.when(authService.verifyEmail("verify-token")).thenReturn(EmailVerificationResponse.builder()
                .email("new@test.com")
                .message("이메일 인증이 완료되었습니다.")
                .build());
    }

    @Test
    void testLogin() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"test@test.com\",\"password\":\"password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.name").value("테스트 사용자"))
                .andExpect(jsonPath("$.email").value("test@test.com"))
                .andExpect(jsonPath("$.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.permissionPreset").value("MANAGER"))
                .andExpect(jsonPath("$.pagePermissions[0]").value("DASHBOARD"))
                .andExpect(jsonPath("$.passwordChangeRequired").value(true));
    }

    @Test
    void testChangePassword() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void registerEndpointReturnsAcceptedMessage() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"신규사용자\",\"email\":\"new@test.com\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@test.com"));
    }

    @Test
    void verifyEmailEndpointReturnsSuccess() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/verify-email")
                        .param("token", "verify-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("이메일 인증이 완료되었습니다."));
    }

    @Test
    void loginReturnsFriendlyMessageWhenCredentialsAreInvalid() throws Exception {
        Mockito.when(authService.login(any(AuthRequest.class)))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invalid@test.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 올바르지 않습니다."));
    }
}
