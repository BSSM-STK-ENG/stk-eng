export type ProviderType = 'openai' | 'anthropic' | 'google' | string;

export type ChatContextMode = 'inventory' | 'sql' | 'general';

export type ProviderCredentialStatus = 'missing' | 'saving' | 'saved' | 'verified' | 'error';
export type CredentialValidationStatus = 'unknown' | 'success' | 'failed';

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ModelDescriptor {
  id: string;
  name: string;
  description?: string;
  provider: ProviderType;
  recommended?: boolean;
  contextWindow?: string;
  capabilities?: string[];
}

export interface ProviderDescriptor {
  provider: ProviderType;
  label: string;
  description?: string;
  models: ModelDescriptor[];
}

export interface ProviderCredential {
  provider: ProviderType;
  hasKey: boolean;
  maskedKey: string | null;
  status: ProviderCredentialStatus;
  updatedAt?: string | null;
  validationStatus?: CredentialValidationStatus;
  validationMessage?: string | null;
  validatedAt?: string | null;
}

export interface AiPreferences {
  provider: ProviderType;
  model: string;
}

export interface ToolTrace {
  kind: 'sql' | 'inventory' | 'analysis' | 'lookup' | 'other';
  title: string;
  summary: string;
  sql?: string;
  sourceViews?: string[];
  rowCount?: number;
  durationMs?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  provider: ProviderType;
  model: string;
  contextMode: ChatContextMode;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  status?: 'pending' | 'sent' | 'error';
  toolTrace?: ToolTrace[];
}

export interface ChatRequest {
  sessionId?: string | null;
  provider: ProviderType;
  model: string;
  message: string;
  contextMode: ChatContextMode;
}

export interface ChatResponse {
  assistantMessage: ChatMessage;
  sessionId: string;
  messageId: string;
  toolTrace?: ToolTrace[];
  provider?: ProviderType;
  model?: string;
  title?: string;
  contextMode?: ChatContextMode;
}

export interface CreateChatSessionRequest {
  provider: ProviderType;
  model: string;
  title?: string;
  contextMode: ChatContextMode;
}

export interface UpdateCredentialRequest {
  apiKey: string;
  model: string;
}

export interface UpdateAiPreferencesRequest {
  provider: ProviderType;
  model: string;
}

export interface CredentialConnectionTestResponse {
  success: boolean;
  provider: ProviderType;
  model: string;
  message: string;
  checkedAt: string;
}
