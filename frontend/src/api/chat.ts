import type {
  AiPreferences,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatSession,
  CreateChatSessionRequest,
  CredentialConnectionTestResponse,
  ModelDescriptor,
  ProviderCredential,
  ProviderDescriptor,
  UpdateAiPreferencesRequest,
  UpdateCredentialRequest,
} from '../types/chat';
import api from './axios';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const candidate = record.providers ?? record.models ?? record.items ?? record.data ?? record.results;
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function unwrapObject<T>(data: unknown): T | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  return null;
}

function normalizeProviderCatalog(data: unknown): ProviderDescriptor[] {
  return unwrapList<ProviderDescriptor>(data).map((provider) => ({
    ...provider,
    models: Array.isArray(provider.models) ? provider.models : [],
  }));
}

function normalizeModels(data: unknown, provider: string): ModelDescriptor[] {
  return unwrapList<ModelDescriptor>(data).map((model) => ({
    ...model,
    provider: model.provider ?? provider,
  }));
}

export async function getChatProviders(): Promise<ProviderDescriptor[]> {
  const { data } = await api.get('/ai/providers');
  return normalizeProviderCatalog(data);
}

export async function getChatModels(provider: string): Promise<ModelDescriptor[]> {
  const { data } = await api.get('/ai/models', { params: { provider } });
  return normalizeModels(data, provider);
}

export async function getChatCredentials(): Promise<ProviderCredential[]> {
  const { data } = await api.get('/ai/credentials');
  return unwrapList<ProviderCredential>(data);
}

export async function saveChatCredential(
  provider: string,
  payload: UpdateCredentialRequest,
): Promise<ProviderCredential | null> {
  const { data } = await api.put(`/ai/credentials/${provider}`, payload);
  return unwrapObject<ProviderCredential>(data);
}

export async function testChatCredential(
  provider: string,
  payload: UpdateCredentialRequest,
): Promise<CredentialConnectionTestResponse | null> {
  const { data } = await api.post(`/ai/credentials/${provider}/test`, payload);
  return unwrapObject<CredentialConnectionTestResponse>(data);
}

export async function deleteChatCredential(provider: string): Promise<void> {
  await api.delete(`/ai/credentials/${provider}`);
}

export async function getAiPreferences(): Promise<AiPreferences | null> {
  const { data } = await api.get('/ai/preferences');
  return unwrapObject<AiPreferences>(data);
}

export async function saveAiPreferences(payload: UpdateAiPreferencesRequest): Promise<AiPreferences | null> {
  const { data } = await api.put('/ai/preferences', payload);
  return unwrapObject<AiPreferences>(data);
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const { data } = await api.get('/ai/sessions');
  return unwrapList<ChatSession>(data);
}

export async function createChatSession(payload: CreateChatSessionRequest): Promise<ChatSession | null> {
  const { data } = await api.post('/ai/sessions', payload);
  return unwrapObject<ChatSession>(data);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await api.get(`/ai/sessions/${sessionId}/messages`);
  return unwrapList<ChatMessage>(data);
}

export async function sendChatMessage(payload: ChatRequest, signal?: AbortSignal): Promise<ChatResponse | null> {
  const { data } = await api.post('/ai/chat', payload, { signal });
  return unwrapObject<ChatResponse>(data);
}
