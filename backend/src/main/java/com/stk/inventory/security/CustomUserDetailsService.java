package com.stk.inventory.security;

import com.stk.inventory.entity.User;
import com.stk.inventory.service.UserPermissionService;
import com.stk.inventory.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserPermissionService userPermissionService;

    public CustomUserDetailsService(UserRepository userRepository, UserPermissionService userPermissionService) {
        this.userRepository = userRepository;
        this.userPermissionService = userPermissionService;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        userPermissionService.resolvePermissions(user).forEach(permission ->
                authorities.add(new SimpleGrantedAuthority(permission.authority()))
        );

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}
