package com.stk.inventory.service;

import com.stk.inventory.dto.InventoryCalendarDayResponse;
import com.stk.inventory.dto.InventoryCalendarResponse;
import com.stk.inventory.dto.InventoryCalendarTransactionResponse;
import com.stk.inventory.entity.InventoryTransaction;
import com.stk.inventory.entity.TransactionType;
import com.stk.inventory.repository.InventoryTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InventoryCalendarService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Seoul");

    private final InventoryTransactionRepository inventoryTransactionRepository;

    public InventoryCalendarService(InventoryTransactionRepository inventoryTransactionRepository) {
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    public InventoryCalendarResponse getCalendar(String monthValue) {
        YearMonth targetMonth = parseMonth(monthValue);
        LocalDate monthStart = targetMonth.atDay(1);
        LocalDate monthEnd = targetMonth.atEndOfMonth();
        LocalDateTime from = monthStart.atStartOfDay();
        LocalDateTime to = monthEnd.plusDays(1).atStartOfDay();

        List<InventoryTransaction> transactions = inventoryTransactionRepository
                .findByTransactionDateGreaterThanEqualAndTransactionDateLessThanOrderByTransactionDateAsc(from, to);

        Map<LocalDate, DayAccumulator> dayAccumulators = new LinkedHashMap<>();
        for (int day = 1; day <= targetMonth.lengthOfMonth(); day += 1) {
            dayAccumulators.put(targetMonth.atDay(day), new DayAccumulator());
        }

        int totalInboundQty = 0;
        int totalOutboundQty = 0;

        List<InventoryCalendarTransactionResponse> transactionResponses = new ArrayList<>();

        for (InventoryTransaction transaction : transactions) {
            LocalDate transactionDate = transaction.getTransactionDate().toLocalDate();
            DayAccumulator accumulator = dayAccumulators.get(transactionDate);
            if (accumulator == null) {
                continue;
            }

            int inboundQty = 0;
            int outboundQty = 0;

            if (transaction.getTransactionType() == TransactionType.IN || transaction.getTransactionType() == TransactionType.RETURN) {
                inboundQty = nullSafe(transaction.getQuantity());
                accumulator.inboundCount += 1;
            } else if (transaction.getTransactionType() == TransactionType.OUT) {
                outboundQty = nullSafe(transaction.getQuantity());
                accumulator.outboundCount += 1;
            }

            accumulator.inboundQty += inboundQty;
            accumulator.outboundQty += outboundQty;
            accumulator.transactionCount += 1;
            totalInboundQty += inboundQty;
            totalOutboundQty += outboundQty;

            transactionResponses.add(new InventoryCalendarTransactionResponse(
                    transaction.getId(),
                    transaction.getTransactionType().name(),
                    resolveTransactionLabel(transaction.getTransactionType()),
                    transaction.getMaterial().getMaterialCode(),
                    transaction.getMaterial().getMaterialName(),
                    transaction.getQuantity(),
                    transaction.getTransactionDate(),
                    transaction.getBusinessUnit(),
                    transaction.getManager(),
                    transaction.getNote(),
                    transaction.getReference(),
                    transaction.getCreatedBy() == null ? null : transaction.getCreatedBy().getEmail()
            ));
        }

        List<InventoryCalendarDayResponse> dayResponses = dayAccumulators.entrySet().stream()
                .map((entry) -> {
                    DayAccumulator accumulator = entry.getValue();
                    return new InventoryCalendarDayResponse(
                            entry.getKey(),
                            accumulator.inboundQty,
                            accumulator.outboundQty,
                            accumulator.inboundQty - accumulator.outboundQty,
                            accumulator.inboundCount,
                            accumulator.outboundCount,
                            accumulator.transactionCount
                    );
                })
                .toList();

        long activeDays = dayResponses.stream()
                .filter(day -> day.transactionCount() > 0)
                .count();

        return new InventoryCalendarResponse(
                targetMonth.toString(),
                monthStart,
                monthEnd,
                totalInboundQty,
                totalOutboundQty,
                (int) activeDays,
                transactions.size(),
                dayResponses,
                transactionResponses
        );
    }

    private YearMonth parseMonth(String monthValue) {
        if (monthValue == null || monthValue.isBlank()) {
            return YearMonth.now(APP_ZONE);
        }

        try {
            return YearMonth.parse(monthValue.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month 파라미터는 YYYY-MM 형식이어야 합니다.");
        }
    }

    private String resolveTransactionLabel(TransactionType transactionType) {
        return switch (transactionType) {
            case IN -> "입고";
            case OUT -> "출고";
            case RETURN -> "반입";
            case EXCHANGE -> "교환";
        };
    }

    private int nullSafe(Integer value) {
        return value == null ? 0 : value;
    }

    private static final class DayAccumulator {
        private int inboundQty;
        private int outboundQty;
        private int inboundCount;
        private int outboundCount;
        private int transactionCount;
    }
}
