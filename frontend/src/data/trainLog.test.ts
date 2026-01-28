import { describe, it, expect } from 'vitest';
import { shouldPurchase, generateTrainLogs } from './trainLog';
import { generateItems } from './items';
import { generateUsers } from './users';
import { createRng } from '../utils/random';
import type { User, Item } from '../types';

describe('trainLog', () => {
  describe('shouldPurchase', () => {
    // Purchase rule: user buys item if user's color value >= threshold
    const threshold = 128;

    describe('Red items', () => {
      const redItem: Item = { itemId: 'R-1', color: 'R', count: 1 };

      it('returns true when user.r >= threshold', () => {
        const user: User = { userId: 'U1', r: 200, g: 50, b: 50 };
        expect(shouldPurchase(user, redItem, threshold)).toBe(true);
      });

      it('returns true when user.r == threshold (boundary)', () => {
        const user: User = { userId: 'U1', r: 128, g: 50, b: 50 };
        expect(shouldPurchase(user, redItem, threshold)).toBe(true);
      });

      it('returns false when user.r < threshold', () => {
        const user: User = { userId: 'U1', r: 100, g: 200, b: 200 };
        expect(shouldPurchase(user, redItem, threshold)).toBe(false);
      });

      it('returns false when user.r == threshold - 1 (boundary)', () => {
        const user: User = { userId: 'U1', r: 127, g: 255, b: 255 };
        expect(shouldPurchase(user, redItem, threshold)).toBe(false);
      });
    });

    describe('Green items', () => {
      const greenItem: Item = { itemId: 'G-1', color: 'G', count: 1 };

      it('returns true when user.g >= threshold', () => {
        const user: User = { userId: 'U1', r: 50, g: 200, b: 50 };
        expect(shouldPurchase(user, greenItem, threshold)).toBe(true);
      });

      it('returns false when user.g < threshold', () => {
        const user: User = { userId: 'U1', r: 200, g: 50, b: 200 };
        expect(shouldPurchase(user, greenItem, threshold)).toBe(false);
      });
    });

    describe('Blue items', () => {
      const blueItem: Item = { itemId: 'B-1', color: 'B', count: 1 };

      it('returns true when user.b >= threshold', () => {
        const user: User = { userId: 'U1', r: 50, g: 50, b: 200 };
        expect(shouldPurchase(user, blueItem, threshold)).toBe(true);
      });

      it('returns false when user.b < threshold', () => {
        const user: User = { userId: 'U1', r: 200, g: 200, b: 50 };
        expect(shouldPurchase(user, blueItem, threshold)).toBe(false);
      });
    });

    describe('threshold variations', () => {
      it('with threshold=0, all purchases succeed', () => {
        const user: User = { userId: 'U1', r: 0, g: 0, b: 0 };
        const items: Item[] = [
          { itemId: 'R-1', color: 'R', count: 1 },
          { itemId: 'G-1', color: 'G', count: 1 },
          { itemId: 'B-1', color: 'B', count: 1 },
        ];
        for (const item of items) {
          expect(shouldPurchase(user, item, 0)).toBe(true);
        }
      });

      it('with threshold=256, no purchases succeed', () => {
        const user: User = { userId: 'U1', r: 255, g: 255, b: 255 };
        const items: Item[] = [
          { itemId: 'R-1', color: 'R', count: 1 },
          { itemId: 'G-1', color: 'G', count: 1 },
          { itemId: 'B-1', color: 'B', count: 1 },
        ];
        for (const item of items) {
          expect(shouldPurchase(user, item, 256)).toBe(false);
        }
      });
    });
  });

  describe('generateTrainLogs', () => {
    it('generates correct number of logs (users * proposalsPerUser)', () => {
      const rng = createRng(42);
      const users = generateUsers(createRng(1), 10, 'U');
      const items = generateItems();

      const logs = generateTrainLogs(rng, users, items, 128, 10);
      expect(logs).toHaveLength(10 * 10);
    });

    it('produces deterministic results with same seed', () => {
      const users = generateUsers(createRng(1), 20, 'U');
      const items = generateItems();

      const rng1 = createRng(42);
      const rng2 = createRng(42);

      const logs1 = generateTrainLogs(rng1, users, items, 128);
      const logs2 = generateTrainLogs(rng2, users, items, 128);

      expect(logs1).toEqual(logs2);
    });

    it('logs contain valid references', () => {
      const rng = createRng(42);
      const users = generateUsers(createRng(1), 10, 'U');
      const items = generateItems();

      const logs = generateTrainLogs(rng, users, items, 128);

      const userIds = new Set(users.map((u) => u.userId));
      const itemIds = new Set(items.map((i) => i.itemId));

      for (const log of logs) {
        expect(userIds.has(log.userId)).toBe(true);
        expect(itemIds.has(log.itemId)).toBe(true);
        expect(log.shownIndex).toBeGreaterThanOrEqual(0);
        expect(log.shownIndex).toBeLessThan(10);
        expect(typeof log.purchased).toBe('boolean');
      }
    });

    it('purchase decisions follow the color rule', () => {
      const rng = createRng(42);
      const items = generateItems();

      // Create users with known RGB values for testing
      const users: User[] = [
        { userId: 'HIGH_R', r: 200, g: 50, b: 50 }, // Should buy R
        { userId: 'HIGH_G', r: 50, g: 200, b: 50 }, // Should buy G
        { userId: 'HIGH_B', r: 50, g: 50, b: 200 }, // Should buy B
        { userId: 'LOW_ALL', r: 50, g: 50, b: 50 }, // Should buy nothing
      ];

      const threshold = 128;
      const logs = generateTrainLogs(rng, users, items, threshold, 100);

      const userMap = new Map(users.map((u) => [u.userId, u]));
      const itemMap = new Map(items.map((i) => [i.itemId, i]));

      for (const log of logs) {
        const user = userMap.get(log.userId)!;
        const item = itemMap.get(log.itemId)!;
        const expectedPurchase = shouldPurchase(user, item, threshold);
        expect(log.purchased).toBe(expectedPurchase);
      }
    });

    /**
     * Statistical test: verify purchase rate matches expected probability
     *
     * With threshold=128 and uniform RGB distribution:
     * P(user.r >= 128) = 128/256 = 0.5 for each color
     * P(purchase) = P(item is R) * P(user.r >= T) + P(item is G) * P(user.g >= T) + P(item is B) * P(user.b >= T)
     *             = 1/3 * 0.5 + 1/3 * 0.5 + 1/3 * 0.5 = 0.5
     */
    it('purchase rate converges to expected probability (statistical test)', () => {
      const rng = createRng(42);
      const users = generateUsers(createRng(1), 1000, 'U');
      const items = generateItems();
      const threshold = 128;

      const logs = generateTrainLogs(rng, users, items, threshold, 100);
      const purchaseRate = logs.filter((l) => l.purchased).length / logs.length;

      // Expected rate: ~0.5 with threshold=128
      // Allow 5% tolerance for statistical variance
      expect(purchaseRate).toBeGreaterThan(0.45);
      expect(purchaseRate).toBeLessThan(0.55);
    });

    it('lower threshold increases purchase rate (statistical test)', () => {
      const users = generateUsers(createRng(1), 500, 'U');
      const items = generateItems();

      const logsLowThreshold = generateTrainLogs(createRng(42), users, items, 64, 50);
      const logsHighThreshold = generateTrainLogs(createRng(42), users, items, 192, 50);

      const rateLow = logsLowThreshold.filter((l) => l.purchased).length / logsLowThreshold.length;
      const rateHigh = logsHighThreshold.filter((l) => l.purchased).length / logsHighThreshold.length;

      // Lower threshold should result in higher purchase rate
      expect(rateLow).toBeGreaterThan(rateHigh);
    });
  });
});
