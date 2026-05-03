import type { ProviderDescriptor } from '../../types/chat';

export const DEFAULT_PROVIDER_CATALOG: ProviderDescriptor[] = [
  {
    provider: 'gemma',
    label: 'Gemma 4',
    description: 'API 키 없이 브라우저에서 내장 Gemma 4를 실행합니다.',
    models: [
      {
        id: 'gemma4',
        name: 'Gemma 4',
        provider: 'gemma',
        recommended: true,
        description: 'API 키 없이 브라우저에서 실행되는 기본 모델',
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
