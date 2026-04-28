package com.stk.inventory.service;

import com.stk.inventory.dto.MaterialDto;
import com.stk.inventory.dto.MonthlyClosingDto;
import com.stk.inventory.dto.QuickSearchResult;
import com.stk.inventory.dto.TransactionResponse;
import com.stk.inventory.entity.ClosingStatus;
import com.stk.inventory.entity.Material;
import com.stk.inventory.mapper.MonthlyClosingMapper;
import com.stk.inventory.mapper.TransactionMapper;
import com.stk.inventory.repository.InventoryTransactionRepository;
import com.stk.inventory.repository.MaterialRepository;
import com.stk.inventory.repository.MonthlyClosingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.Locale;

@Service
public class QuickSearchService {

    private final MaterialRepository materialRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final MonthlyClosingRepository monthlyClosingRepository;
    private final TransactionMapper transactionMapper;
    private final MonthlyClosingMapper monthlyClosingMapper;
    private final FinanceAccessService financeAccessService;

    public QuickSearchService(MaterialRepository materialRepository,
                              InventoryTransactionRepository inventoryTransactionRepository,
                              MonthlyClosingRepository monthlyClosingRepository,
                              TransactionMapper transactionMapper,
                              MonthlyClosingMapper monthlyClosingMapper,
                              FinanceAccessService financeAccessService) {
        this.materialRepository = materialRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.monthlyClosingRepository = monthlyClosingRepository;
        this.transactionMapper = transactionMapper;
        this.monthlyClosingMapper = monthlyClosingMapper;
        this.financeAccessService = financeAccessService;
    }

    @Transactional(readOnly = true)
    public QuickSearchResult search(String rawQuery) {
        String query = normalize(rawQuery);

        QuickSearchResult result = new QuickSearchResult();
        result.setQuery(query);
        result.setMaterials(searchMaterials(query));
        result.setRecentTransactions(getRecentTransactions());
        result.setCurrentClosing(getCurrentClosing());
        return result;
    }

    private List<MaterialDto> searchMaterials(String query) {
        if (query == null) {
            return List.of();
        }

        return materialRepository.findAllByOrderByMaterialCodeAsc().stream()
                .filter(material -> containsIgnoreCase(material.getMaterialCode(), query)
                        || containsIgnoreCase(material.getMaterialName(), query))
                .limit(10)
                .map(this::toMaterialDto)
                .toList();
    }

    private List<TransactionResponse> getRecentTransactions() {
        boolean includeFinancials = financeAccessService.canViewFinancialSummaries();
        return inventoryTransactionRepository.findByRevertedFalseAndSystemGeneratedFalse(
                        PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "transactionDate", "id")))
                .getContent()
                .stream()
                .map(transaction -> transactionMapper.toResponse(transaction, includeFinancials))
                .toList();
    }

    private MonthlyClosingDto getCurrentClosing() {
        String currentMonth = YearMonth.now().toString();
        return monthlyClosingRepository.findById(currentMonth)
                .map(closing -> monthlyClosingMapper.toDto(closing, false))
                .orElseGet(() -> {
                    MonthlyClosingDto dto = new MonthlyClosingDto();
                    dto.closingMonth = currentMonth;
                    dto.status = ClosingStatus.UNCLOSED;
                    return dto;
                });
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private MaterialDto toMaterialDto(Material material) {
        MaterialDto dto = new MaterialDto();
        dto.setMaterialCode(material.getMaterialCode());
        dto.setMaterialName(material.getMaterialName());
        dto.setDescription(material.getDescription());
        dto.setLocation(material.getLocation());
        dto.setSafeStockQty(material.getSafeStockQty());
        dto.setCurrentStockQty(material.getCurrentStockQty());
        dto.setImageUrl(material.getImageUrl());
        return dto;
    }

}
