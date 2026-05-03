import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

const DEFAULT_MODEL_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task';
const DEFAULT_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm';

let inferencePromise: Promise<LlmInference> | null = null;

function getModelUrl() {
  return import.meta.env.VITE_GEMMA4_MODEL_URL ?? DEFAULT_MODEL_URL;
}

function getWasmUrl() {
  return import.meta.env.VITE_MEDIAPIPE_GENAI_WASM_URL ?? DEFAULT_WASM_URL;
}

function assertBrowserSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('gpu' in navigator)) {
    throw new Error('Gemma 4 브라우저 실행은 WebGPU를 지원하는 Chrome/Edge 데스크톱 브라우저가 필요합니다.');
  }
}

export function getBrowserGemmaStatus() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function formatGemma4Prompt(message: string) {
  return `<|turn>system
You are an inventory assistant for a warehouse management app. Answer in Korean.<turn|>
<|turn>user
${message.trim()}<turn|>
<|turn>model`;
}

async function getInference() {
  assertBrowserSupport();
  inferencePromise ??= (async () => {
    const genai = await FilesetResolver.forGenAiTasks(getWasmUrl());
    return LlmInference.createFromOptions(genai, {
      baseOptions: {
        modelAssetPath: getModelUrl(),
      },
      maxTokens: 1024,
      topK: 40,
      temperature: 0.8,
      randomSeed: 101,
    });
  })();
  return inferencePromise;
}

export async function generateBrowserGemmaResponse(message: string) {
  const inference = await getInference();
  return inference.generateResponse(formatGemma4Prompt(message));
}
