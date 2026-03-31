package com.stk.inventory.config;

import com.stk.inventory.security.JwtAuthenticationFilter;
import com.stk.inventory.security.PasswordChangeRequiredFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PasswordChangeRequiredFilter passwordChangeRequiredFilter;
    private final List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          PasswordChangeRequiredFilter passwordChangeRequiredFilter,
                          @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}") String allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.passwordChangeRequiredFilter = passwordChangeRequiredFilter;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration conf = new CorsConfiguration();
                conf.setAllowedOrigins(allowedOrigins);
                conf.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                conf.setAllowedHeaders(List.of("*"));
                conf.setAllowCredentials(true);
                return conf;
            }))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/verify-email").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/materials").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_DASHBOARD", "PAGE_CURRENT_STOCK", "PAGE_INBOUND", "PAGE_OUTBOUND", "PAGE_MASTER_DATA", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.POST, "/api/materials").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA")
                .requestMatchers(HttpMethod.PUT, "/api/materials/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA", "PAGE_CURRENT_STOCK", "PAGE_INBOUND")
                .requestMatchers(HttpMethod.DELETE, "/api/materials/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA")
                .requestMatchers(HttpMethod.GET, "/api/inventory/ledger").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_DASHBOARD", "PAGE_STOCK_LEDGER", "PAGE_INBOUND", "PAGE_OUTBOUND")
                .requestMatchers(HttpMethod.GET, "/api/inventory/history").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_HISTORY")
                .requestMatchers(HttpMethod.GET, "/api/inventory/stock-trends").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_DASHBOARD", "PAGE_CURRENT_STOCK")
                .requestMatchers(HttpMethod.GET, "/api/inventory/calendar").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.POST, "/api/inventory/inbound", "/api/inventory/upload/inbound").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_INBOUND")
                .requestMatchers(HttpMethod.POST, "/api/inventory/outbound", "/api/inventory/upload/outbound").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_OUTBOUND")
                .requestMatchers(HttpMethod.POST, "/api/inventory/*/revert").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_INBOUND", "PAGE_OUTBOUND", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.PUT, "/api/inventory/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.DELETE, "/api/inventory/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.GET, "/api/closing").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_CLOSING")
                .requestMatchers(HttpMethod.POST, "/api/closing/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_CLOSING")
                .requestMatchers(HttpMethod.GET, "/api/users/options").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_OUTBOUND")
                .requestMatchers(HttpMethod.GET, "/api/master-data/business-units").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA", "PAGE_INBOUND", "PAGE_OUTBOUND")
                .requestMatchers(HttpMethod.POST, "/api/master-data/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA")
                .requestMatchers(HttpMethod.PUT, "/api/master-data/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA")
                .requestMatchers(HttpMethod.DELETE, "/api/master-data/**").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_MASTER_DATA")
                .requestMatchers(HttpMethod.GET, "/api/export/current").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_CURRENT_STOCK")
                .requestMatchers(HttpMethod.GET, "/api/export/ledger").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_STOCK_LEDGER")
                .requestMatchers(HttpMethod.GET, "/api/export/history").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_HISTORY")
                .requestMatchers(HttpMethod.GET, "/api/export/inbound").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_INBOUND")
                .requestMatchers(HttpMethod.GET, "/api/export/outbound").hasAnyAuthority("ROLE_SUPER_ADMIN", "PAGE_OUTBOUND")
                .requestMatchers("/api/admin/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(passwordChangeRequiredFilter, JwtAuthenticationFilter.class);

        return http.build();
    }
}
