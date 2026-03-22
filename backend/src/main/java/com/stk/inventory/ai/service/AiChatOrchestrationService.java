package com.stk.inventory.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stk.inventory.ai.dto.*;
import com.stk.inventory.ai.entity.ChatMessage;
import com.stk.inventory.ai.entity.ChatSession;
import com.stk.inventory.ai.model.AiPromptMessage;
import com.stk.inventory.ai.model.ChatRole;
import com.stk.inventory.ai.model.ProviderCompletion;
import com.stk.inventory.ai.repository.ChatMessageRepository;
import com.stk.inventory.ai.repository.ChatSessionRepository;
import com.stk.inventory.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AiChatOrchestrationService {

    private final AiCurrentUserService currentUserService;
    private final ProviderCredentialService providerCredentialService;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;
    private final Map<com.stk.inventory.ai.model.ProviderType, LlmProviderClient> clients;
    private final InventoryToolRegistryService toolRegistryService;
    private final RelativeDateContextService relativeDateContextService;

    public AiChatOrchestrationService(AiCurrentUserService currentUserService,
                                      ProviderCredentialService providerCredentialService,
                                      ChatSessionRepository chatSessionRepository,
                                      ChatMessageRepository chatMessageRepository,
                                      ObjectMapper objectMapper,
                                      List<LlmProviderClient> llmProviderClients,
                                      InventoryToolRegistryService toolRegistryService,
                                      RelativeDateContextService relativeDateContextService) {
        this.currentUserService = currentUserService;
        this.providerCredentialService = providerCredentialService;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
        this.toolRegistryService = toolRegistryService;
        this.relativeDateContextService = relativeDateContextService;
        this.clients = llmProviderClients.stream().collect(HashMap::new, (map, client) -> map.put(client.providerType(), client), HashMap::putAll);
    }

    public List<ChatSessionResponse> getSessions() {
        User user = currentUserService.requireCurrentUser();
        return chatSessionRepository.findAllByUserOrderByUpdatedAtDesc(user).stream()
                .map(this::toSessionResponse)
                .toList();
    }

    @Transactional
    public ChatSessionResponse createSession(CreateSessionRequest request) {
        User user = currentUserService.requireCurrentUser();
        ChatSession session = ChatSession.builder()
                .user(user)
                .provider(request.provider())
                .model(request.model())
                .contextMode(request.contextMode())
                .title(buildTitle(request.title(), request.model()))
                .build();
        return toSessionResponse(chatSessionRepository.save(session));
    }

    public List<ChatMessageResponse> getMessages(UUID sessionId) {
        User user = currentUserService.requireCurrentUser();
        ChatSession session = chatSessionRepository.findByIdAndUser(sessionId, user)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Chat session not found"));

        return chatMessageRepository.findAllBySessionOrderByCreatedAtAsc(session).stream()
                .map(this::toMessageResponse)
                .toList();
    }

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        User user = currentUserService.requireCurrentUser();
        ChatSession session = resolveSession(user, request);
        session.setProvider(request.provider());
        session.setModel(request.model());
        session.setContextMode(request.contextMode());
        if (session.getTitle() == null || session.getTitle().isBlank()) {
            session.setTitle(buildTitle(request.message(), request.model()));
        }
        chatSessionRepository.save(session);

        chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role(ChatRole.USER)
                .content(request.message().trim())
                .build());

        String apiKey = providerCredentialService.requireApiKey(user, request.provider());
        LlmProviderClient providerClient = clients.get(request.provider());
        if (providerClient == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Unsupported provider");
        }

        List<ToolExecutionTrace> traces = new ArrayList<>();
        ToolExecutionTrace schemaTrace = toolRegistryService.describeSchema();
        traces.add(schemaTrace);

        String plannerResponseText = providerClient.complete(
                apiKey,
                request.model(),
                buildPlannerMessages(session, request.message(), schemaTrace)
        ).text();

        SqlPlanResponse sqlPlan = parseSqlPlan(plannerResponseText);
        ToolExecutionTrace queryTrace;
        try {
            queryTrace = toolRegistryService.runSqlQuery(sqlPlan.sql());
            traces.add(queryTrace);
        } catch (ResponseStatusException ex) {
            ToolExecutionTrace errorTrace = new ToolExecutionTrace(
                    "inventory_sql_query",
                    "error",
                    "Inventory DB query failed",
                    Map.of("sql", sqlPlan.sql()),
                    Map.of("error", ex.getReason())
            );
            traces.add(errorTrace);
            return persistAssistantFailure(session, "재고 DB 조회 실패: " + ex.getReason(), traces);
        }

        ToolExecutionTrace formatterTrace = toolRegistryService.formatAnswer(request.message(), queryTrace);
        traces.add(formatterTrace);

        ProviderCompletion answerCompletion = providerClient.complete(
                apiKey,
                request.model(),
                buildAnswerMessages(session, request.message(), formatterTrace)
        );

        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .content(answerCompletion.text())
                .toolMetadata(toJson(traces))
                .build());

        ChatMessageResponse assistantResponse = toMessageResponse(assistantMessage);
        return new ChatResponse(
                session.getId(),
                assistantMessage.getId(),
                assistantResponse,
                traces.stream().map(this::toToolTraceResponse).toList(),
                session.getProvider().value(),
                session.getModel(),
                session.getTitle(),
                session.getContextMode()
        );
    }

    private ChatResponse persistAssistantFailure(ChatSession session, String content, List<ToolExecutionTrace> traces) {
        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .content(content)
                .toolMetadata(toJson(traces))
                .build());

        ChatMessageResponse assistantResponse = toMessageResponse(assistantMessage);
        return new ChatResponse(
                session.getId(),
                assistantMessage.getId(),
                assistantResponse,
                traces.stream().map(this::toToolTraceResponse).toList(),
                session.getProvider().value(),
                session.getModel(),
                session.getTitle(),
                session.getContextMode()
        );
    }

    private ChatSession resolveSession(User user, ChatRequest request) {
        if (request.sessionId() == null) {
            return chatSessionRepository.save(ChatSession.builder()
                    .user(user)
                    .provider(request.provider())
                    .model(request.model())
                    .contextMode(request.contextMode())
                    .title(buildTitle(request.message(), request.model()))
                    .build());
        }

        return chatSessionRepository.findByIdAndUser(request.sessionId(), user)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Chat session not found"));
    }

    private List<AiPromptMessage> buildPlannerMessages(ChatSession session, String latestQuestion, ToolExecutionTrace schemaTrace) {
        String history = buildConversationHistory(session);
        String systemPrompt = """
                You are planning a safe read-only inventory SQL query.
                Return ONLY a JSON object with fields: sql, intent, title.
                The sql must use only the listed inventory tables and views.
                Do not include SQL comments or markdown fences.
                Do not terminate the SQL with a semicolon.
                Prefer a direct SELECT over unnecessary CTEs.
                Use exact column names from the schema.
                You may join the listed inventory tables and views when needed.
                Common examples:
                - For "총 재고가 몇 개야?" use:
                  SELECT COALESCE(SUM(current_stock_qty), 0) AS total_stock FROM material_stock_snapshot
                - For "어제 들어온 물자가 얼마나 있어?" use:
                  SELECT COALESCE(SUM(quantity), 0) AS inbound_qty FROM inventory_transaction_facts WHERE transaction_type = 'IN' AND transaction_day = <resolved date>
                %s

                Schema:
                %s
                """.formatted(relativeDateContextService.buildContextBlock(), schemaTrace.output().get("schema"));

        return List.of(
                new AiPromptMessage("system", systemPrompt),
                new AiPromptMessage("user", """
                        Conversation history:
                        %s

                        Latest user request:
                        %s
                        """.formatted(history, latestQuestion))
        );
    }

    private List<AiPromptMessage> buildAnswerMessages(ChatSession session, String latestQuestion, ToolExecutionTrace formatterTrace) {
        String history = buildConversationHistory(session);
        String systemPrompt = """
                You are an inventory assistant for a warehouse management app.
                Answer in Korean.
                Use only the SQL evidence provided.
                If the user asked a relative date, mention the absolute date you resolved.
                Keep answers concise but concrete.
                When useful, summarize the executed SQL in one short sentence.
                %s
                """.formatted(relativeDateContextService.buildContextBlock());

        return List.of(
                new AiPromptMessage("system", systemPrompt),
                new AiPromptMessage("user", """
                        Conversation history:
                        %s

                        Latest user question:
                        %s

                        Evidence:
                        %s
                        """.formatted(history, latestQuestion, formatterTrace.output()))
        );
    }

    private String buildConversationHistory(ChatSession session) {
        List<ChatMessage> messages = chatMessageRepository.findAllBySessionOrderByCreatedAtAsc(session);
        if (messages.isEmpty()) {
            return "(no prior messages)";
        }

        StringBuilder builder = new StringBuilder();
        for (ChatMessage message : messages) {
            builder.append(message.getRole().name()).append(": ").append(message.getContent()).append("\n");
        }
        return builder.toString().trim();
    }

    private SqlPlanResponse parseSqlPlan(String rawText) {
        String json = extractJson(rawText);
        try {
            SqlPlanResponse response = objectMapper.readValue(json, SqlPlanResponse.class);
            if (response.sql() == null || response.sql().isBlank()) {
                throw new ResponseStatusException(BAD_GATEWAY, "Provider did not return SQL");
            }
            return response;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Failed to parse provider SQL plan", ex);
        }
    }

    private String extractJson(String rawText) {
        String trimmed = rawText == null ? "" : rawText.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start == -1 || end == -1 || start >= end) {
            throw new ResponseStatusException(BAD_GATEWAY, "Provider response did not contain JSON");
        }
        return trimmed.substring(start, end + 1);
    }

    private String buildTitle(String source, String fallbackModel) {
        String basis = (source == null || source.isBlank()) ? fallbackModel : source;
        String trimmed = basis.trim();
        return trimmed.length() > 32 ? trimmed.substring(0, 32) + "..." : trimmed;
    }

    private ChatSessionResponse toSessionResponse(ChatSession session) {
        return new ChatSessionResponse(
                session.getId(),
                session.getProvider().value(),
                session.getModel(),
                session.getContextMode(),
                session.getTitle(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getSession().getId(),
                message.getRole().value(),
                message.getContent(),
                parseToolTrace(message.getToolMetadata()),
                message.getCreatedAt()
        );
    }

    private List<ToolTraceResponse> parseToolTrace(String rawToolMetadata) {
        if (rawToolMetadata == null || rawToolMetadata.isBlank()) {
            return List.of();
        }

        try {
            List<ToolExecutionTrace> traces = objectMapper.readValue(rawToolMetadata, new TypeReference<>() {
            });
            return traces.stream().map(this::toToolTraceResponse).toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private ToolTraceResponse toToolTraceResponse(ToolExecutionTrace trace) {
        String sql = null;
        Integer rowCount = null;
        if (trace.output() != null) {
            Object executedSql = trace.output().get("executedSql");
            if (executedSql instanceof String executed) {
                sql = executed;
            }
            Object rowCountValue = trace.output().get("rowCount");
            if (rowCountValue instanceof Number number) {
                rowCount = number.intValue();
            }
        }
        if (sql == null && trace.input() != null) {
            Object rawSql = trace.input().get("sql");
            if (rawSql instanceof String text) {
                sql = text;
            }
        }

        String kind = switch (trace.toolName()) {
            case "inventory_sql_query" -> "sql";
            case "inventory_schema_describe", "inventory_answer_formatter" -> "inventory";
            default -> "other";
        };
        String title = switch (trace.toolName()) {
            case "inventory_sql_query" -> "SQL Query";
            case "inventory_schema_describe" -> "Schema Context";
            case "inventory_answer_formatter" -> "Inventory Evidence";
            default -> trace.toolName();
        };

        return new ToolTraceResponse(
                kind,
                title,
                trace.summary(),
                sql,
                List.of("inventory_transaction_facts", "material_stock_snapshot", "monthly_closing_status"),
                rowCount,
                trace.input(),
                trace.output()
        );
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize tool metadata", ex);
        }
    }
}
