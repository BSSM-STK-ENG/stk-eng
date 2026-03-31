package com.stk.inventory.service;

import com.stk.inventory.dto.MasterDataCreateRequest;
import com.stk.inventory.dto.MasterDataItemResponse;
import com.stk.inventory.entity.MasterDataItem;
import com.stk.inventory.entity.MasterDataType;
import com.stk.inventory.repository.MasterDataItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MasterDataService {

    private final MasterDataItemRepository masterDataItemRepository;

    public MasterDataService(MasterDataItemRepository masterDataItemRepository) {
        this.masterDataItemRepository = masterDataItemRepository;
    }

    @Transactional(readOnly = true)
    public List<MasterDataItemResponse> getBusinessUnits() {
        return getItems(MasterDataType.BUSINESS_UNIT);
    }

    @Transactional(readOnly = true)
    public List<MasterDataItemResponse> getManagers() {
        return getItems(MasterDataType.MANAGER);
    }

    @Transactional
    public MasterDataItemResponse createBusinessUnit(MasterDataCreateRequest request) {
        return createItem(MasterDataType.BUSINESS_UNIT, request, "사업장");
    }

    @Transactional
    public MasterDataItemResponse updateBusinessUnit(Long id, MasterDataCreateRequest request) {
        return updateItem(MasterDataType.BUSINESS_UNIT, id, request, "사업장");
    }

    @Transactional
    public MasterDataItemResponse createManager(MasterDataCreateRequest request) {
        return createItem(MasterDataType.MANAGER, request, "담당자");
    }

    @Transactional
    public void deleteBusinessUnit(Long id) {
        deleteItem(MasterDataType.BUSINESS_UNIT, id, "사업장");
    }

    @Transactional
    public void deleteManager(Long id) {
        deleteItem(MasterDataType.MANAGER, id, "담당자");
    }

    @Transactional(readOnly = true)
    public String requireRegisteredBusinessUnit(String value) {
        return requireRegisteredValue(MasterDataType.BUSINESS_UNIT, value, "사업장");
    }

    @Transactional(readOnly = true)
    public String requireRegisteredManager(String value) {
        return requireRegisteredValue(MasterDataType.MANAGER, value, "담당자");
    }

    private List<MasterDataItemResponse> getItems(MasterDataType type) {
        return masterDataItemRepository.findAllByTypeOrderByNameAsc(type).stream()
                .map(this::toResponse)
                .toList();
    }

    private MasterDataItemResponse createItem(MasterDataType type, MasterDataCreateRequest request, String label) {
        String normalizedName = normalizeName(request.getName(), label);
        if (masterDataItemRepository.existsByTypeAndNameIgnoreCase(type, normalizedName)) {
            throw new IllegalArgumentException("이미 등록된 " + label + "입니다.");
        }

        MasterDataItem saved = masterDataItemRepository.save(MasterDataItem.builder()
                .type(type)
                .name(normalizedName)
                .build());
        return toResponse(saved);
    }

    private MasterDataItemResponse updateItem(MasterDataType type, Long id, MasterDataCreateRequest request, String label) {
        MasterDataItem item = masterDataItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(label + " 정보를 찾을 수 없습니다."));
        if (item.getType() != type) {
            throw new IllegalArgumentException(label + " 정보를 찾을 수 없습니다.");
        }

        String normalizedName = normalizeName(request.getName(), label);
        masterDataItemRepository.findByTypeAndNameIgnoreCase(type, normalizedName)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("이미 등록된 " + label + "입니다.");
                });

        item.setName(normalizedName);
        return toResponse(masterDataItemRepository.save(item));
    }

    private void deleteItem(MasterDataType type, Long id, String label) {
        MasterDataItem item = masterDataItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(label + " 정보를 찾을 수 없습니다."));
        if (item.getType() != type) {
            throw new IllegalArgumentException(label + " 정보를 찾을 수 없습니다.");
        }
        masterDataItemRepository.delete(item);
    }

    private String requireRegisteredValue(MasterDataType type, String value, String label) {
        String normalizedName = normalizeName(value, label);
        return masterDataItemRepository.findByTypeAndNameIgnoreCase(type, normalizedName)
                .map(MasterDataItem::getName)
                .orElseThrow(() -> new IllegalArgumentException("등록된 " + label + "만 선택할 수 있습니다."));
    }

    private String normalizeName(String value, String label) {
        String normalizedName = value == null ? "" : value.trim();
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException(label + "을(를) 먼저 등록하고 선택하세요.");
        }
        if (normalizedName.length() > 120) {
            throw new IllegalArgumentException(label + " 이름이 너무 깁니다.");
        }
        return normalizedName;
    }

    private MasterDataItemResponse toResponse(MasterDataItem item) {
        return MasterDataItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .build();
    }
}
