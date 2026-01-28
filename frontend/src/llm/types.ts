export interface RAGChunk {
  id: string;
  source: string;
  headers: string[];
  text: string;
}

export interface RAGResult {
  chunk: RAGChunk;
  score: number;
}

export type PromptMode = 'good' | 'bad' | 'custom';

export interface LLMStatus {
  stage: 'idle' | 'loading' | 'ready' | 'generating' | 'error';
  progress?: number;
  message?: string;
}

export interface InsightRequest {
  results: {
    method: string;
    purchaseRate: number;
    avgPurchases: number;
    totalPurchases: number;
  }[];
  threshold: number;
  nInferUsers: number;
}
