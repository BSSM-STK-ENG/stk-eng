package com.stk.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuickSearchResult {
    private String query;
    private List<MaterialDto> materials;
    private List<TransactionResponse> recentTransactions;
    private MonthlyClosingDto currentClosing;
}
