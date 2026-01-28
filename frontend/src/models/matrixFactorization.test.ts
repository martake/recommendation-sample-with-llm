import { describe, it, expect } from 'vitest';
import { trainMF, scoreItems, adaptUserOnline } from './matrixFactorization';
import { generateItems } from '../data/items';
import { generateUsers } from '../data/users';
import { generateTrainLogs } from '../data/trainLog';
import { createRng } from '../utils/random';

describe('matrixFactorization', () => {
  // Helper to create test data
  function createTestData(seed: number, nUsers: number = 100) {
    const rngData = createRng(seed);
    const users = generateUsers(rngData, nUsers, 'U');
    const items = generateItems();
    const logs = generateTrainLogs(createRng(seed + 1), users, items, 128, 10);
    return { users, items, logs };
  }

  describe('trainMF', () => {
    it('returns model with correct dimensions', () => {
      const { users, items, logs } = createTestData(42);
      const rng = createRng(42);
      const k = 8;

      const model = trainMF(rng, users, items, logs, 10, k);

      expect(model.k).toBe(k);
      expect(model.userEmbeddings).toHaveLength(users.length);
      expect(model.itemEmbeddings).toHaveLength(items.length);

      for (const emb of model.userEmbeddings) {
        expect(emb).toHaveLength(k);
      }
      for (const emb of model.itemEmbeddings) {
        expect(emb).toHaveLength(k);
      }
    });

    it('produces deterministic results with same seed', () => {
      const { users, items, logs } = createTestData(42);

      const model1 = trainMF(createRng(123), users, items, logs, 10, 8);
      const model2 = trainMF(createRng(123), users, items, logs, 10, 8);

      expect(model1.userEmbeddings).toEqual(model2.userEmbeddings);
      expect(model1.itemEmbeddings).toEqual(model2.itemEmbeddings);
    });

    it('produces different results with different seeds', () => {
      const { users, items, logs } = createTestData(42);

      const model1 = trainMF(createRng(111), users, items, logs, 10, 8);
      const model2 = trainMF(createRng(222), users, items, logs, 10, 8);

      expect(model1.userEmbeddings).not.toEqual(model2.userEmbeddings);
    });

    it('more epochs leads to better fit (lower reconstruction error)', () => {
      const { users, items, logs } = createTestData(42, 50);

      const modelFewEpochs = trainMF(createRng(42), users, items, logs, 5, 8);
      const modelManyEpochs = trainMF(createRng(42), users, items, logs, 50, 8);

      // Calculate reconstruction error
      function calcError(model: ReturnType<typeof trainMF>) {
        const userIndex = new Map(users.map((u, i) => [u.userId, i]));
        const itemIndex = new Map(items.map((it, i) => [it.itemId, i]));

        let totalError = 0;
        for (const log of logs) {
          const ui = userIndex.get(log.userId)!;
          const ii = itemIndex.get(log.itemId)!;
          const pred = model.userEmbeddings[ui].reduce(
            (sum, val, d) => sum + val * model.itemEmbeddings[ii][d],
            0
          );
          const target = log.purchased ? 1 : 0;
          totalError += (target - pred) ** 2;
        }
        return totalError / logs.length;
      }

      const errorFew = calcError(modelFewEpochs);
      const errorMany = calcError(modelManyEpochs);

      // More epochs should reduce error
      expect(errorMany).toBeLessThan(errorFew);
    });

    it('embeddings have reasonable magnitude', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 20, 8);

      // Check that embeddings don't explode
      for (const emb of [...model.userEmbeddings, ...model.itemEmbeddings]) {
        for (const val of emb) {
          expect(Math.abs(val)).toBeLessThan(10);
        }
      }
    });
  });

  describe('scoreItems', () => {
    it('returns scores for all items', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      const userVec = model.userEmbeddings[0];
      const scores = scoreItems(userVec, model);

      expect(scores).toHaveLength(items.length);
    });

    it('returns consistent scores for same user vector', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      const userVec = model.userEmbeddings[0];
      const scores1 = scoreItems(userVec, model);
      const scores2 = scoreItems(userVec, model);

      expect(scores1).toEqual(scores2);
    });

    it('dot product calculation is correct', () => {
      const model = {
        userEmbeddings: [],
        itemEmbeddings: [[1, 2, 3], [4, 5, 6]],
        k: 3,
      };
      const userVec = [1, 1, 1];

      const scores = scoreItems(userVec, model);

      // [1,1,1] · [1,2,3] = 6
      // [1,1,1] · [4,5,6] = 15
      expect(scores[0]).toBe(6);
      expect(scores[1]).toBe(15);
    });
  });

  describe('adaptUserOnline', () => {
    it('returns vector of same dimension', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      const userVec = Array.from({ length: model.k }, () => 0.1);
      const adapted = adaptUserOnline(userVec, model, 0, true);

      expect(adapted).toHaveLength(model.k);
    });

    it('does not mutate original vector', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      const userVec = Array.from({ length: model.k }, () => 0.1);
      const original = [...userVec];
      adaptUserOnline(userVec, model, 0, true);

      expect(userVec).toEqual(original);
    });

    it('moves vector toward item when purchased', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      const userVec = Array.from({ length: model.k }, () => 0);
      const itemIdx = 0;
      const itemVec = model.itemEmbeddings[itemIdx];

      const adapted = adaptUserOnline(userVec, model, itemIdx, true, 10, 0.1, 0);

      // After adaptation with purchase, dot product should increase
      const dotBefore = userVec.reduce((sum, v, i) => sum + v * itemVec[i], 0);
      const dotAfter = adapted.reduce((sum, v, i) => sum + v * itemVec[i], 0);

      expect(dotAfter).toBeGreaterThan(dotBefore);
    });

    it('moves vector away from item when not purchased', () => {
      const { users, items, logs } = createTestData(42);
      const model = trainMF(createRng(42), users, items, logs, 10, 8);

      // Start with vector that has positive dot product with item
      const itemIdx = 0;
      const itemVec = model.itemEmbeddings[itemIdx];
      const userVec = itemVec.map((v) => v * 0.5); // Start aligned with item

      const adapted = adaptUserOnline(userVec, model, itemIdx, false, 10, 0.1, 0);

      // After adaptation without purchase, dot product should decrease
      const dotBefore = userVec.reduce((sum, v, i) => sum + v * itemVec[i], 0);
      const dotAfter = adapted.reduce((sum, v, i) => sum + v * itemVec[i], 0);

      expect(dotAfter).toBeLessThan(dotBefore);
    });
  });
});
