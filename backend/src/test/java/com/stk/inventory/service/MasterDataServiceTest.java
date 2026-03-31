package com.stk.inventory.service;

import com.stk.inventory.dto.MasterDataCreateRequest;
import com.stk.inventory.dto.MasterDataItemResponse;
import com.stk.inventory.entity.MasterDataItem;
import com.stk.inventory.entity.MasterDataType;
import com.stk.inventory.repository.MasterDataItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MasterDataServiceTest {

    @Mock
    private MasterDataItemRepository masterDataItemRepository;

    @Test
    void createBusinessUnitSavesNormalizedName() {
        MasterDataService service = new MasterDataService(masterDataItemRepository);
        MasterDataCreateRequest request = new MasterDataCreateRequest();
        request.setName("  QA-T1  ");

        when(masterDataItemRepository.existsByTypeAndNameIgnoreCase(MasterDataType.BUSINESS_UNIT, "QA-T1"))
                .thenReturn(false);
        when(masterDataItemRepository.save(any(MasterDataItem.class))).thenAnswer(invocation -> {
            MasterDataItem item = invocation.getArgument(0);
            item.setId(1L);
            return item;
        });

        MasterDataItemResponse response = service.createBusinessUnit(request);

        ArgumentCaptor<MasterDataItem> captor = ArgumentCaptor.forClass(MasterDataItem.class);
        verify(masterDataItemRepository).save(captor.capture());
        assertEquals(MasterDataType.BUSINESS_UNIT, captor.getValue().getType());
        assertEquals("QA-T1", captor.getValue().getName());
        assertEquals(1L, response.getId());
        assertEquals("QA-T1", response.getName());
    }

    @Test
    void createManagerRejectsDuplicateName() {
        MasterDataService service = new MasterDataService(masterDataItemRepository);
        MasterDataCreateRequest request = new MasterDataCreateRequest();
        request.setName("Port QA");

        when(masterDataItemRepository.existsByTypeAndNameIgnoreCase(MasterDataType.MANAGER, "Port QA"))
                .thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.createManager(request));
        assertEquals("이미 등록된 담당자입니다.", exception.getMessage());
    }

    @Test
    void requireRegisteredManagerReturnsStoredValue() {
        MasterDataService service = new MasterDataService(masterDataItemRepository);
        when(masterDataItemRepository.findByTypeAndNameIgnoreCase(MasterDataType.MANAGER, "Port QA"))
                .thenReturn(Optional.of(MasterDataItem.builder()
                        .id(2L)
                        .type(MasterDataType.MANAGER)
                        .name("Port QA")
                        .build()));

        String value = service.requireRegisteredManager(" Port QA ");

        assertEquals("Port QA", value);
    }

    @Test
    void updateBusinessUnitUpdatesNameWhenDifferentItemHasNoConflict() {
        MasterDataService service = new MasterDataService(masterDataItemRepository);
        MasterDataCreateRequest request = new MasterDataCreateRequest();
        request.setName("  운영팀  ");

        MasterDataItem existing = MasterDataItem.builder()
                .id(3L)
                .type(MasterDataType.BUSINESS_UNIT)
                .name("QA-T1")
                .build();

        when(masterDataItemRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(masterDataItemRepository.findByTypeAndNameIgnoreCase(MasterDataType.BUSINESS_UNIT, "운영팀")).thenReturn(Optional.empty());
        when(masterDataItemRepository.save(any(MasterDataItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MasterDataItemResponse response = service.updateBusinessUnit(3L, request);

        assertEquals("운영팀", existing.getName());
        assertEquals("운영팀", response.getName());
    }
}
