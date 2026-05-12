import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

const DEFAULT_MODEL_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task';
const DEFAULT_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm';

let inferencePromise: Promise<LlmInference> | null = null;

function getWebGpu() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: unknown } }).gpu;
  return typeof gpu?.requestAdapter === 'function' ? (gpu as { requestAdapter: () => Promise<unknown> }) : null;
}

function getModelUrl() {
  return import.meta.env.VITE_GEMMA4_MODEL_URL ?? DEFAULT_MODEL_URL;
}

function getWasmUrl() {
  return import.meta.env.VITE_MEDIAPIPE_GENAI_WASM_URL ?? DEFAULT_WASM_URL;
}

async function assertBrowserSupport() {
  const gpu = getWebGpu();
  if (!gpu) {
    throw new Error('Gemma 4 브라우저 실행은 WebGPU를 지원하는 Chrome/Edge 데스크톱 브라우저가 필요합니다.');
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Gemma 4 브라우저 실행은 WebGPU를 지원하는 Chrome/Edge 데스크톱 브라우저가 필요합니다.');
  }
}

export async function getBrowserGemmaStatus() {
  try {
    await assertBrowserSupport();
    return true;
  } catch {
    return false;
  }
}

function formatGemma4Prompt(message: string, inventoryContext?: string | null) {
  const contextBlock = inventoryContext ? `${inventoryContext.trim()}\n\n` : '';
  return `<|turn>system
You are an inventory assistant for a warehouse management app. Answer in Korean.
When DB_CONTEXT is provided, treat it as the trusted source of truth from the app database.
If DB_CONTEXT contains a directly relevant "직접답", use that numeric fact in the final answer.
Do not say you cannot access the database when DB_CONTEXT is present.
Keep database-backed answers concise and include the date or scope when it matters.<turn|>
<|turn>user
${contextBlock}${message.trim()}<turn|>
<|turn>model`;
}

async function getInference() {
  await assertBrowserSupport();
  inferencePromise ??= (async () => {
    const genai = await FilesetResolver.forGenAiTasks(getWasmUrl());
    return LlmInference.createFromOptions(genai, {
      baseOptions: {
        modelAssetPath: getModelUrl(),
      },
      maxTokens: 1024,
      topK: 40,
      temperature: 0.3,
      randomSeed: 101,
    });
  })();
  return inferencePromise;
}

export async function generateBrowserGemmaResponse(message: string, inventoryContext?: string | null) {
  const inference = await getInference();
  return inference.generateResponse(formatGemma4Prompt(message, inventoryContext));
}
