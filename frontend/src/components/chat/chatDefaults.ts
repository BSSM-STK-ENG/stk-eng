import type { ProviderDescriptor } from '../../types/chat';

export const DEFAULT_PROVIDER_CATALOG: ProviderDescriptor[] = [
  {
    provider: 'openai',
    label: 'ChatGPT',
    description: '정밀한 요약과 범용 질의에 적합합니다.',
    models: [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        recommended: true,
        description: '기본 분석과 추론용 플래그십 모델',
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        provider: 'openai',
        description: '빠른 실무형 기본 모델',
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        provider: 'openai',
        description: '호환용 경량 모델',
      },
    ],
  },
  {
    provider: 'anthropic',
    label: 'Claude',
    description: '긴 문맥과 추론형 응답에 적합합니다.',
    models: [
      {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        recommended: true,
        description: '균형 잡힌 분석과 정리',
      },
      {
        id: 'claude-3-7-sonnet-latest',
        name: 'Claude 3.7 Sonnet',
        provider: 'anthropic',
        description: '긴 문맥 대응과 추론 강화',
      },
      {
        id: 'claude-3-5-haiku-latest',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        description: '빠른 응답 중심',
      },
    ],
  },
  {
    provider: 'google',
    label: 'Gemini',
    description: 'DB 질의와 빠른 응답을 함께 다룹니다.',
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        recommended: true,
        description: '복잡한 문맥과 분석',
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: '빠른 실무형 응답',
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        description: '호환용 경량 모델',
      },
    ],
  },
];

export function getFallbackProvider(provider: string): ProviderDescriptor {
  const match = DEFAULT_PROVIDER_CATALOG.find((item) => item.provider === provider);
  return (
    match ?? {
      provider,
      label: provider,
      description: '등록된 모델 카탈로그가 없습니다.',
      models: [],
    }
  );
}

export function getFallbackProviderModels(provider: string) {
  return getFallbackProvider(provider).models;
}
