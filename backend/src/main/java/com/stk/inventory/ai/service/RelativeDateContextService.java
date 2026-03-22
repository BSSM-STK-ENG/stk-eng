package com.stk.inventory.ai.service;

import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class RelativeDateContextService {

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

    public String buildContextBlock() {
        ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
        return """
                All relative dates must be resolved in Asia/Seoul timezone.
                Current datetime: %s
                Today: %s
                Yesterday: %s
                Tomorrow: %s
                Always mention resolved absolute dates in the final answer when the user asks relative dates.
                """.formatted(
                now.format(DATE_TIME_FORMATTER),
                now.toLocalDate().format(DATE_FORMATTER),
                now.minusDays(1).toLocalDate().format(DATE_FORMATTER),
                now.plusDays(1).toLocalDate().format(DATE_FORMATTER)
        );
    }
}
