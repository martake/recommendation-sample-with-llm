import { describe, it, expect } from 'vitest';
import { generateUsers } from './users';
import { createRng } from '../utils/random';

describe('users', () => {
  describe('generateUsers', () => {
    it('generates specified number of users', () => {
      const rng = createRng(42);
      const users = generateUsers(rng, 100, 'U');
      expect(users).toHaveLength(100);
    });

    it('generates unique userIds with correct prefix', () => {
      const rng = createRng(42);
      const users = generateUsers(rng, 50, 'TEST');

      const ids = users.map((u) => u.userId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(50);

      for (const id of ids) {
        expect(id).toMatch(/^TEST\d{4}$/);
      }
    });

    it('generates RGB values in valid range [0, 255]', () => {
      const rng = createRng(42);
      const users = generateUsers(rng, 1000, 'U');

      for (const user of users) {
        expect(user.r).toBeGreaterThanOrEqual(0);
        expect(user.r).toBeLessThanOrEqual(255);
        expect(user.g).toBeGreaterThanOrEqual(0);
        expect(user.g).toBeLessThanOrEqual(255);
        expect(user.b).toBeGreaterThanOrEqual(0);
        expect(user.b).toBeLessThanOrEqual(255);

        // Ensure integers
        expect(Number.isInteger(user.r)).toBe(true);
        expect(Number.isInteger(user.g)).toBe(true);
        expect(Number.isInteger(user.b)).toBe(true);
      }
    });

    it('produces deterministic results with same seed', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);

      const users1 = generateUsers(rng1, 50, 'U');
      const users2 = generateUsers(rng2, 50, 'U');

      expect(users1).toEqual(users2);
    });

    it('produces different results with different seeds', () => {
      const rng1 = createRng(111);
      const rng2 = createRng(222);

      const users1 = generateUsers(rng1, 50, 'U');
      const users2 = generateUsers(rng2, 50, 'U');

      // Same IDs (deterministic) but different RGB values
      expect(users1.map((u) => u.userId)).toEqual(users2.map((u) => u.userId));
      expect(users1.map((u) => u.r)).not.toEqual(users2.map((u) => u.r));
    });

    it('produces uniform RGB distribution (statistical test)', () => {
      const rng = createRng(42);
      const users = generateUsers(rng, 10000, 'U');

      // Test that RGB values are roughly uniformly distributed
      // Split into quarters [0-63, 64-127, 128-191, 192-255]
      const rBuckets = [0, 0, 0, 0];
      const gBuckets = [0, 0, 0, 0];
      const bBuckets = [0, 0, 0, 0];

      for (const user of users) {
        rBuckets[Math.floor(user.r / 64)]++;
        gBuckets[Math.floor(user.g / 64)]++;
        bBuckets[Math.floor(user.b / 64)]++;
      }

      const expected = users.length / 4;
      const tolerance = 0.15; // 15% tolerance

      for (const buckets of [rBuckets, gBuckets, bBuckets]) {
        for (const count of buckets) {
          expect(count).toBeGreaterThan(expected * (1 - tolerance));
          expect(count).toBeLessThan(expected * (1 + tolerance));
        }
      }
    });
  });
});
