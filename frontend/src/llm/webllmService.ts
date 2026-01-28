import * as webllm from '@mlc-ai/web-llm';
import type { LLMStatus } from './types';

let engine: webllm.MLCEngine | null = null;
let currentModelId: string | null = null;

// Model selection based on language
const MODELS = {
  en: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  ja: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
} as const;

export function getModelIdForLanguage(lang: string): string {
  return lang === 'ja' ? MODELS.ja : MODELS.en;
}

export async function initializeLLM(
  onStatusChange: (status: LLMStatus) => void,
  lang: string = 'en',
): Promise<void> {
  const targetModelId = getModelIdForLanguage(lang);

  // If same model is already loaded, skip
  if (engine && currentModelId === targetModelId) return;

  onStatusChange({ stage: 'loading', progress: 0, message: 'Initializing WebLLM...' });

  try {
    if (!engine) {
      engine = new webllm.MLCEngine();
    }

    engine.setInitProgressCallback((progress: { progress: number; text: string }) => {
      onStatusChange({
        stage: 'loading',
        progress: progress.progress * 100,
        message: progress.text,
      });
    });

    await engine.reload(targetModelId);
    currentModelId = targetModelId;

    onStatusChange({ stage: 'ready', message: 'Model loaded' });
  } catch (error) {
    onStatusChange({
      stage: 'error',
      message: error instanceof Error ? error.message : 'Failed to load model',
    });
    throw error;
  }
}

export async function generateResponse(
  prompt: string,
  onStatusChange: (status: LLMStatus) => void,
  onToken?: (token: string) => void,
): Promise<string> {
  if (!engine) {
    throw new Error('LLM not initialized');
  }

  onStatusChange({ stage: 'generating', message: 'Generating response...' });

  try {
    let fullResponse = '';

    const response = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of response) {
      const token = chunk.choices[0]?.delta?.content || '';
      fullResponse += token;
      if (onToken) onToken(token);
    }

    onStatusChange({ stage: 'ready', message: 'Generation complete' });
    return fullResponse;
  } catch (error) {
    onStatusChange({
      stage: 'error',
      message: error instanceof Error ? error.message : 'Generation failed',
    });
    throw error;
  }
}

export function isLLMReady(): boolean {
  return engine !== null && currentModelId !== null;
}

export function getCurrentModelId(): string | null {
  return currentModelId;
}

export function getModelIdForCurrentLanguage(lang: string): string {
  return getModelIdForLanguage(lang);
}
