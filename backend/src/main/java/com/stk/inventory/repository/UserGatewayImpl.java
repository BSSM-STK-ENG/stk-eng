package com.stk.inventory.repository;

import com.stk.inventory.entity.User;
import com.stk.inventory.gateway.UserGateway;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserGatewayImpl implements UserGateway {

    private final UserRepository userRepository;

    public UserGatewayImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public List<User> findAllByOrderByCreatedAtDesc() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByNameIgnoreCase(String name) {
        return userRepository.existsByNameIgnoreCase(name);
    }

    @Override
    public boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id) {
        return userRepository.existsByNameIgnoreCaseAndIdNot(name, id);
    }

    @Override
    public boolean existsByPermissionPreset(String presetKey) {
        return userRepository.existsByPermissionPreset(presetKey);
    }

    @Override
    public boolean existsByRoleProfileKey(String roleProfileKey) {
        return userRepository.existsByRoleProfileKey(roleProfileKey);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    @Override
    public User save(User user) {
        return userRepository.save(user);
    }

    @Override
    public void delete(User user) {
        userRepository.delete(user);
    }

    @Override
    public void flush() {
        userRepository.flush();
    }
}
