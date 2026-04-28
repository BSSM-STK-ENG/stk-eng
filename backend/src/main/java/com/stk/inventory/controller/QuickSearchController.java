package com.stk.inventory.controller;

import com.stk.inventory.dto.QuickSearchRequest;
import com.stk.inventory.dto.QuickSearchResult;
import com.stk.inventory.service.QuickSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quick-search")
public class QuickSearchController {

    private final QuickSearchService quickSearchService;

    public QuickSearchController(QuickSearchService quickSearchService) {
        this.quickSearchService = quickSearchService;
    }

    @PostMapping
    public ResponseEntity<QuickSearchResult> search(@RequestBody QuickSearchRequest request) {
        return ResponseEntity.ok(quickSearchService.search(request.getQuery()));
    }
}
