import type { RAGChunk, RAGResult } from './types';

let chunks: RAGChunk[] = [];
let embeddings: number[][] = [];
let isLoaded = false;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function loadRAGData(): Promise<void> {
  if (isLoaded) return;

  const baseUrl = import.meta.env.BASE_URL;

  const [chunksRes, embeddingsRes] = await Promise.all([
    fetch(`${baseUrl}rag/chunks.json`),
    fetch(`${baseUrl}rag/embeddings.json`),
  ]);

  chunks = await chunksRes.json();
  embeddings = await embeddingsRes.json();
  isLoaded = true;
}

export function searchRAG(queryEmbedding: number[], topK: number = 5): RAGResult[] {
  if (!isLoaded || chunks.length === 0) {
    return [];
  }

  const results: RAGResult[] = chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, embeddings[i]),
  }));

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export function getChunks(): RAGChunk[] {
  return chunks;
}

export function getEmbeddings(): number[][] {
  return embeddings;
}

// Simple keyword-based search fallback (no embedding required)
export function searchRAGByKeywords(query: string, topK: number = 5): RAGResult[] {
  if (!isLoaded || chunks.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const results: RAGResult[] = chunks.map((chunk) => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += 1;
      }
    }

    // Boost for header matches
    for (const header of chunk.headers) {
      const headerLower = header.toLowerCase();
      for (const word of queryWords) {
        if (headerLower.includes(word)) {
          score += 2;
        }
      }
    }

    return { chunk, score };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK).filter((r) => r.score > 0);
}

// Get relevant chunks for recommendation analysis
export function getRelevantChunksForAnalysis(): RAGChunk[] {
  if (!isLoaded) return [];

  // Return chunks related to purchase rules, methods, and metrics
  const keywords = ['purchase', 'rule', 'method', 'metric', 'recommendation', 'collaborative'];

  const results = searchRAGByKeywords(keywords.join(' '), 8);
  return results.map((r) => r.chunk);
}
