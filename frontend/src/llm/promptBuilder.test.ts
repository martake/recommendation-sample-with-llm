import { describe, it, expect } from 'vitest';
import { buildPrompt, getDefaultCustomPrompt } from './promptBuilder';
import type { InsightRequest, RAGChunk } from './types';

describe('promptBuilder', () => {
  const mockRequest: InsightRequest = {
    results: [
      { method: 'random', purchaseRate: 0.45, avgPurchases: 4.5, totalPurchases: 450 },
      { method: 'memory-based', purchaseRate: 0.62, avgPurchases: 6.2, totalPurchases: 620 },
      { method: 'model-based', purchaseRate: 0.58, avgPurchases: 5.8, totalPurchases: 580 },
    ],
    threshold: 128,
    nInferUsers: 100,
  };

  const mockRagChunks: RAGChunk[] = [
    {
      id: 'chunk1',
      source: 'rules',
      headers: ['Purchase Rules'],
      text: 'Users purchase items based on color matching rules.',
    },
    {
      id: 'chunk2',
      source: 'rules',
      headers: ['Methods', 'Model-based'],
      text: 'Model-based CF uses matrix factorization.',
    },
  ];

  describe('buildPrompt', () => {
    describe('English prompts', () => {
      it('includes RAG context in system prompt', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('Purchase Rules');
        expect(prompt).toContain('Users purchase items based on color matching rules');
      });

      it('includes results data', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('random');
        expect(prompt).toContain('45.0%');
        expect(prompt).toContain('memory-based');
        expect(prompt).toContain('62.0%');
      });

      it('includes threshold and user count', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('128');
        expect(prompt).toContain('100');
      });

      it('good mode includes detailed instructions', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('summary');
        expect(prompt).toContain('explanation');
        expect(prompt).toContain('WHY');
      });

      it('bad mode uses minimal prompt', () => {
        const prompt = buildPrompt('bad', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('Here are some numbers');
        expect(prompt).toContain('What do you think');
      });

      it('custom mode uses provided prompt', () => {
        const customPrompt = 'Custom analysis request: {results}';
        const prompt = buildPrompt('custom', customPrompt, mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('Custom analysis request');
        expect(prompt).toContain('random');
      });

      it('includes English language instruction', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('MUST respond in English');
      });
    });

    describe('Japanese prompts', () => {
      it('uses Japanese system context', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'ja');

        expect(prompt).toContain('推薦システム');
        expect(prompt).toContain('AIアシスタント');
      });

      it('formats results in Japanese', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'ja');

        expect(prompt).toContain('購入率');
        expect(prompt).toContain('購入/ユーザー');
      });

      it('good mode uses Japanese instructions', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'ja');

        expect(prompt).toContain('分析');
        expect(prompt).toContain('説明');
        expect(prompt).toContain('購買ルール');
      });

      it('bad mode uses Japanese minimal prompt', () => {
        const prompt = buildPrompt('bad', '', mockRequest, mockRagChunks, 'ja');

        expect(prompt).toContain('数値を見て');
        expect(prompt).toContain('どう思いますか');
      });

      it('includes Japanese language instruction', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'ja');

        expect(prompt).toContain('必ず日本語で回答');
      });
    });

    describe('RAG context handling', () => {
      it('handles empty RAG chunks', () => {
        const prompt = buildPrompt('good', '', mockRequest, [], 'en');

        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });

      it('includes all chunk headers', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('Purchase Rules');
        expect(prompt).toContain('Methods > Model-based');
      });

      it('includes chunk text content', () => {
        const prompt = buildPrompt('good', '', mockRequest, mockRagChunks, 'en');

        expect(prompt).toContain('color matching rules');
        expect(prompt).toContain('matrix factorization');
      });
    });

    describe('placeholder replacement', () => {
      it('replaces {results} placeholder', () => {
        const customPrompt = 'Results: {results}';
        const prompt = buildPrompt('custom', customPrompt, mockRequest, [], 'en');

        expect(prompt).not.toContain('{results}');
        expect(prompt).toContain('random');
      });

      it('replaces {threshold} placeholder', () => {
        const customPrompt = 'Threshold is {threshold}';
        const prompt = buildPrompt('custom', customPrompt, mockRequest, [], 'en');

        expect(prompt).not.toContain('{threshold}');
        expect(prompt).toContain('128');
      });

      it('replaces {nInferUsers} placeholder', () => {
        const customPrompt = 'Users: {nInferUsers}';
        const prompt = buildPrompt('custom', customPrompt, mockRequest, [], 'en');

        expect(prompt).not.toContain('{nInferUsers}');
        expect(prompt).toContain('100');
      });
    });
  });

  describe('getDefaultCustomPrompt', () => {
    it('returns English prompt for en language', () => {
      const prompt = getDefaultCustomPrompt('en');

      expect(prompt).toContain('Analyze');
      expect(prompt).toContain('Results');
      expect(prompt).not.toContain('分析');
    });

    it('returns Japanese prompt for ja language', () => {
      const prompt = getDefaultCustomPrompt('ja');

      expect(prompt).toContain('分析');
      expect(prompt).toContain('結果');
    });

    it('defaults to English for unknown language', () => {
      const prompt = getDefaultCustomPrompt('fr');

      expect(prompt).toContain('Analyze');
    });
  });
});
