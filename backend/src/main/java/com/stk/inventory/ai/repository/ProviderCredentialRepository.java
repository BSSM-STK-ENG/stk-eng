package com.stk.inventory.ai.repository;

import com.stk.inventory.ai.entity.ProviderCredential;
import com.stk.inventory.ai.model.ProviderType;
import com.stk.inventory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProviderCredentialRepository extends JpaRepository<ProviderCredential, Long> {
    List<ProviderCredential> findAllByUserOrderByProviderAsc(User user);
    Optional<ProviderCredential> findByUserAndProvider(User user, ProviderType provider);
    void deleteByUserAndProvider(User user, ProviderType provider);
}
