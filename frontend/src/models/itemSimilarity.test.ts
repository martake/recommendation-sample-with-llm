import { describe, it, expect } from 'vitest';
import { buildItemSimilarity, recommendBySimilarity } from './itemSimilarity';
import { generateItems } from '../data/items';
import type { Item, LogEntry } from '../types';

describe('itemSimilarity', () => {
  describe('buildItemSimilarity', () => {
    it('returns NxN matrix where N is number of items', () => {
      const items = generateItems();
      const logs: LogEntry[] = [
        { userId: 'U1', itemId: 'R-1', shownIndex: 0, purchased: true },
        { userId: 'U1', itemId: 'R-2', shownIndex: 1, purchased: true },
      ];

      const sim = buildItemSimilarity(items, logs);

      expect(sim).toHaveLength(items.length);
      for (const row of sim) {
        expect(row).toHaveLength(items.length);
      }
    });

    it('returns symmetric matrix', () => {
      const items = generateItems();
      const logs: LogEntry[] = [
        { userId: 'U1', itemId: 'R-1', shownIndex: 0, purchased: true },
        { userId: 'U1', itemId: 'G-1', shownIndex: 1, purchased: true },
        { userId: 'U2', itemId: 'R-1', shownIndex: 0, purchased: true },
        { userId: 'U2', itemId: 'B-1', shownIndex: 1, purchased: true },
      ];

      const sim = buildItemSimilarity(items, logs);

      for (let i = 0; i < sim.length; i++) {
        for (let j = 0; j < sim.length; j++) {
          expect(sim[i][j]).toBeCloseTo(sim[j][i], 10);
        }
      }
    });

    it('diagonal is zero (no self-similarity)', () => {
      const items = generateItems();
      const logs: LogEntry[] = [
        { userId: 'U1', itemId: 'R-1', shownIndex: 0, purchased: true },
        { userId: 'U1', itemId: 'R-1', shownIndex: 1, purchased: true }, // Same item
      ];

      const sim = buildItemSimilarity(items, logs);

      for (let i = 0; i < sim.length; i++) {
        expect(sim[i][i]).toBe(0);
      }
    });

    it('items co-purchased have positive similarity', () => {
      const items: Item[] = [
        { itemId: 'A', color: 'R', count: 1 },
        { itemId: 'B', color: 'G', count: 1 },
        { itemId: 'C', color: 'B', count: 1 },
      ];

      // A and B are always purchased together, C is separate
      const logs: LogEntry[] = [
        { userId: 'U1', itemId: 'A', shownIndex: 0, purchased: true },
        { userId: 'U1', itemId: 'B', shownIndex: 1, purchased: true },
        { userId: 'U2', itemId: 'A', shownIndex: 0, purchased: true },
        { userId: 'U2', itemId: 'B', shownIndex: 1, purchased: true },
        { userId: 'U3', itemId: 'C', shownIndex: 0, purchased: true },
      ];

      const sim = buildItemSimilarity(items, logs);

      // A(0) and B(1) should have high similarity
      expect(sim[0][1]).toBeGreaterThan(0);
      // A(0) and C(2) should have zero similarity (never co-purchased)
      expect(sim[0][2]).toBe(0);
    });

    it('handles logs with no purchases', () => {
      const items = generateItems();
      const logs: LogEntry[] = [
        { userId: 'U1', itemId: 'R-1', shownIndex: 0, purchased: false },
        { userId: 'U1', itemId: 'G-1', shownIndex: 1, purchased: false },
      ];

      const sim = buildItemSimilarity(items, logs);

      // All similarities should be zero
      for (let i = 0; i < sim.length; i++) {
        for (let j = 0; j < sim.length; j++) {
          expect(sim[i][j]).toBe(0);
        }
      }
    });

    it('cosine similarity is bounded [0, 1]', () => {
      const items = generateItems();
      const logs: LogEntry[] = [];

      // Generate diverse co-purchase patterns
      for (let u = 0; u < 100; u++) {
        for (let i = 0; i < 5; i++) {
          logs.push({
            userId: `U${u}`,
            itemId: items[Math.floor(Math.random() * items.length)].itemId,
            shownIndex: i,
            purchased: true,
          });
        }
      }

      const sim = buildItemSimilarity(items, logs);

      for (let i = 0; i < sim.length; i++) {
        for (let j = 0; j < sim.length; j++) {
          expect(sim[i][j]).toBeGreaterThanOrEqual(0);
          expect(sim[i][j]).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('recommendBySimilarity', () => {
    it('returns items not in purchased set', () => {
      const nItems = 10;
      const sim = Array.from({ length: nItems }, () => new Array(nItems).fill(0.5));
      const purchased = new Set([0, 1, 2]);

      const recommended = recommendBySimilarity(purchased, sim, nItems);

      for (const idx of recommended) {
        expect(purchased.has(idx)).toBe(false);
      }
    });

    it('returns items sorted by score descending', () => {
      const nItems = 5;
      // Create similarity matrix where item 4 is most similar to purchased items
      const sim = Array.from({ length: nItems }, () => new Array(nItems).fill(0));
      sim[0][4] = 1.0; // Item 0 is very similar to item 4
      sim[4][0] = 1.0;
      sim[0][3] = 0.5;
      sim[3][0] = 0.5;
      sim[0][2] = 0.1;
      sim[2][0] = 0.1;

      const purchased = new Set([0]);
      const recommended = recommendBySimilarity(purchased, sim, nItems);

      // Item 4 should be first (highest similarity to purchased item 0)
      expect(recommended[0]).toBe(4);
      expect(recommended[1]).toBe(3);
      expect(recommended[2]).toBe(2);
    });

    it('handles empty purchased set', () => {
      const nItems = 5;
      const sim = Array.from({ length: nItems }, () => new Array(nItems).fill(0));
      const purchased = new Set<number>();

      const recommended = recommendBySimilarity(purchased, sim, nItems);

      // All items should be returned (with zero scores)
      expect(recommended).toHaveLength(nItems);
    });

    it('handles all items purchased', () => {
      const nItems = 5;
      const sim = Array.from({ length: nItems }, () => new Array(nItems).fill(0.5));
      const purchased = new Set([0, 1, 2, 3, 4]);

      const recommended = recommendBySimilarity(purchased, sim, nItems);

      expect(recommended).toHaveLength(0);
    });

    it('aggregates similarity scores from multiple purchased items', () => {
      const nItems = 4;
      const sim = Array.from({ length: nItems }, () => new Array(nItems).fill(0));

      // Item 3 is similar to both item 0 and item 1
      sim[0][3] = 0.5;
      sim[3][0] = 0.5;
      sim[1][3] = 0.5;
      sim[3][1] = 0.5;
      // Item 2 is only similar to item 0
      sim[0][2] = 0.8;
      sim[2][0] = 0.8;

      const purchased = new Set([0, 1]);
      const recommended = recommendBySimilarity(purchased, sim, nItems);

      // Item 3 should rank higher (0.5 + 0.5 = 1.0) than item 2 (0.8)
      expect(recommended[0]).toBe(3);
      expect(recommended[1]).toBe(2);
    });
  });
});
