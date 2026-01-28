import { describe, it, expect } from 'vitest';
import { runInference } from './engine';
import { generateItems } from '../data/items';
import { generateUsers } from '../data/users';
import { generateTrainLogs } from '../data/trainLog';
import { trainMF } from '../models/matrixFactorization';
import { buildItemSimilarity } from '../models/itemSimilarity';
import { createRng } from '../utils/random';

describe('inference engine', () => {
  // Helper to set up full test scenario
  function setupScenario(seed: number, nTrainUsers: number = 100, nInferUsers: number = 50) {
    const items = generateItems();
    const trainUsers = generateUsers(createRng(seed), nTrainUsers, 'TR');
    const inferUsers = generateUsers(createRng(seed + 1), nInferUsers, 'INF');
    const trainLogs = generateTrainLogs(createRng(seed + 2), trainUsers, items, 128, 10);

    const model = trainMF(createRng(seed + 3), trainUsers, items, trainLogs, 20, 8);
    const sim = buildItemSimilarity(items, trainLogs);

    return { items, trainUsers, inferUsers, trainLogs, model, sim };
  }

  describe('runInference', () => {
    it('returns results for all three methods', () => {
      const { items, inferUsers, model, sim } = setupScenario(42);
      const rng = createRng(42);

      const results = runInference(rng, inferUsers, items, 128, model, sim);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.method).sort()).toEqual(['memory-based', 'model-based', 'random']);
    });

    it('produces deterministic results with same seed', () => {
      const { items, inferUsers, model, sim } = setupScenario(42);

      const results1 = runInference(createRng(123), inferUsers, items, 128, model, sim);
      const results2 = runInference(createRng(123), inferUsers, items, 128, model, sim);

      expect(results1).toEqual(results2);
    });

    it('each method generates correct number of logs', () => {
      const { items, inferUsers, model, sim } = setupScenario(42, 100, 30);
      const results = runInference(createRng(42), inferUsers, items, 128, model, sim);

      for (const result of results) {
        // 30 users * 10 proposals each = 300 logs
        expect(result.logs).toHaveLength(30 * 10);
      }
    });

    it('metrics are calculated correctly', () => {
      const { items, inferUsers, model, sim } = setupScenario(42, 100, 20);
      const results = runInference(createRng(42), inferUsers, items, 128, model, sim);

      for (const result of results) {
        const { metrics, logs } = result;

        // Verify totalPurchases
        const actualTotal = logs.filter((l) => l.purchased).length;
        expect(metrics.totalPurchases).toBe(actualTotal);

        // Verify purchaseRate
        const expectedRate = actualTotal / logs.length;
        expect(metrics.purchaseRate).toBeCloseTo(expectedRate, 10);

        // Verify avgPurchasesPerUser
        const expectedAvg = actualTotal / 20; // 20 infer users
        expect(metrics.avgPurchasesPerUser).toBeCloseTo(expectedAvg, 10);

        // Verify histogram sums to user count
        const histogramSum = metrics.histogram.reduce((a, b) => a + b, 0);
        expect(histogramSum).toBe(20);

        // Verify color breakdown sums to total purchases
        const colorSum = metrics.colorBreakdown.R + metrics.colorBreakdown.G + metrics.colorBreakdown.B;
        expect(colorSum).toBe(metrics.totalPurchases);
      }
    });

    it('purchase decisions follow the threshold rule', () => {
      const { items, inferUsers, model, sim } = setupScenario(42);
      const threshold = 128;
      const results = runInference(createRng(42), inferUsers, items, threshold, model, sim);

      const userMap = new Map(inferUsers.map((u) => [u.userId, u]));
      const itemMap = new Map(items.map((i) => [i.itemId, i]));

      for (const result of results) {
        for (const log of result.logs) {
          const user = userMap.get(log.userId)!;
          const item = itemMap.get(log.itemId)!;

          // Verify purchase decision matches the rule
          let expectedPurchase: boolean;
          switch (item.color) {
            case 'R':
              expectedPurchase = user.r >= threshold;
              break;
            case 'G':
              expectedPurchase = user.g >= threshold;
              break;
            case 'B':
              expectedPurchase = user.b >= threshold;
              break;
          }
          expect(log.purchased).toBe(expectedPurchase);
        }
      }
    });

    /**
     * Property test: Model-based and Memory-based should generally outperform Random
     * This is a statistical test that verifies the recommendation algorithms work
     */
    it('intelligent methods outperform random (statistical test)', () => {
      // Run multiple trials to reduce variance
      const trials = 5;
      let modelBetter = 0;
      let memoryBetter = 0;

      for (let trial = 0; trial < trials; trial++) {
        const seed = 1000 + trial * 100;
        const { items, inferUsers, model, sim } = setupScenario(seed, 200, 100);
        const results = runInference(createRng(seed), inferUsers, items, 128, model, sim);

        const randomRate = results.find((r) => r.method === 'random')!.metrics.purchaseRate;
        const modelRate = results.find((r) => r.method === 'model-based')!.metrics.purchaseRate;
        const memoryRate = results.find((r) => r.method === 'memory-based')!.metrics.purchaseRate;

        if (modelRate > randomRate) modelBetter++;
        if (memoryRate > randomRate) memoryBetter++;
      }

      // At least 3 out of 5 trials should show improvement
      expect(modelBetter).toBeGreaterThanOrEqual(3);
      expect(memoryBetter).toBeGreaterThanOrEqual(3);
    });

    it('logs contain valid shownIndex values', () => {
      const { items, inferUsers, model, sim } = setupScenario(42);
      const results = runInference(createRng(42), inferUsers, items, 128, model, sim);

      for (const result of results) {
        for (const log of result.logs) {
          expect(log.shownIndex).toBeGreaterThanOrEqual(0);
          expect(log.shownIndex).toBeLessThan(10);
        }
      }
    });

    it('each user receives exactly 10 proposals', () => {
      const { items, inferUsers, model, sim } = setupScenario(42, 100, 25);
      const results = runInference(createRng(42), inferUsers, items, 128, model, sim);

      for (const result of results) {
        const userProposalCounts = new Map<string, number>();

        for (const log of result.logs) {
          const count = userProposalCounts.get(log.userId) ?? 0;
          userProposalCounts.set(log.userId, count + 1);
        }

        expect(userProposalCounts.size).toBe(25);
        for (const count of userProposalCounts.values()) {
          expect(count).toBe(10);
        }
      }
    });
  });
});
