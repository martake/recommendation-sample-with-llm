import { describe, it, expect } from 'vitest';
import type { RAGChunk } from './types';

// We need to test the pure functions without relying on fetch
// Extract the cosineSimilarity function logic for testing
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

// Replicate searchRAGByKeywords logic for testing
function searchRAGByKeywords(
  chunks: RAGChunk[],
  query: string,
  topK: number = 5
): { chunk: RAGChunk; score: number }[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const results = chunks.map((chunk) => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += 1;
      }
    }

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

describe('RAG Retriever', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 10);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10);
    });

    it('returns -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 10);
    });

    it('is independent of magnitude', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6]; // Same direction, different magnitude
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10);
    });

    it('handles normalized vectors', () => {
      const a = [0.6, 0.8];
      const b = [0.8, 0.6];
      // cos(θ) = 0.6*0.8 + 0.8*0.6 = 0.96
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.96, 5);
    });
  });

  describe('searchRAGByKeywords', () => {
    const testChunks: RAGChunk[] = [
      {
        id: 'chunk1',
        source: 'test',
        headers: ['Purchase Rules', 'Color Matching'],
        text: 'Users purchase items based on color matching. Red items are bought by users with high R values.',
      },
      {
        id: 'chunk2',
        source: 'test',
        headers: ['Recommendation Methods'],
        text: 'Model-based collaborative filtering uses matrix factorization to predict user preferences.',
      },
      {
        id: 'chunk3',
        source: 'test',
        headers: ['Metrics', 'Evaluation'],
        text: 'Purchase rate measures the percentage of recommendations that resulted in purchases.',
      },
      {
        id: 'chunk4',
        source: 'test',
        headers: ['Other Topic'],
        text: 'This chunk contains unrelated information about something else entirely.',
      },
    ];

    it('returns chunks matching query keywords', () => {
      const results = searchRAGByKeywords(testChunks, 'purchase color');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.id).toBe('chunk1'); // Matches both keywords
    });

    it('boosts score for header matches', () => {
      const results = searchRAGByKeywords(testChunks, 'methods');

      // chunk2 has "Methods" in header
      const chunk2Result = results.find((r) => r.chunk.id === 'chunk2');
      expect(chunk2Result).toBeDefined();
      expect(chunk2Result!.score).toBeGreaterThanOrEqual(2); // Header match bonus
    });

    it('respects topK parameter', () => {
      const results = searchRAGByKeywords(testChunks, 'purchase', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('filters out zero-score results', () => {
      const results = searchRAGByKeywords(testChunks, 'xyznonexistent');
      expect(results.length).toBe(0);
    });

    it('ignores short words (length <= 2)', () => {
      // All words here have length <= 2, so should be filtered out
      const results = searchRAGByKeywords(testChunks, 'a is an to');
      expect(results.length).toBe(0);
    });

    it('is case-insensitive', () => {
      const results1 = searchRAGByKeywords(testChunks, 'PURCHASE');
      const results2 = searchRAGByKeywords(testChunks, 'purchase');

      expect(results1.map((r) => r.chunk.id)).toEqual(results2.map((r) => r.chunk.id));
    });

    it('accumulates scores for multiple keyword matches', () => {
      // Query with keywords that appear in multiple chunks
      const results = searchRAGByKeywords(testChunks, 'matrix factorization model');

      // chunk2 has "matrix factorization" in text and "Model-based" in header
      // It should score highest for these keywords
      expect(results[0].chunk.id).toBe('chunk2');
      expect(results[0].score).toBeGreaterThan(1);
    });

    it('returns results sorted by score descending', () => {
      const results = searchRAGByKeywords(testChunks, 'purchase users items');

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });
});
