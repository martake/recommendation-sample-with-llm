import { describe, it, expect } from 'vitest';
import { createRng, randInt, shuffle, choice } from './random';

describe('random utilities', () => {
  describe('createRng', () => {
    it('produces deterministic sequence with same seed', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);

      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences with different seeds', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(54321);

      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());

      expect(seq1).not.toEqual(seq2);
    });

    it('produces values in [0, 1) range', () => {
      const rng = createRng(42);

      for (let i = 0; i < 1000; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('produces uniform distribution (statistical test)', () => {
      const rng = createRng(99);
      const buckets = new Array(10).fill(0);
      const n = 10000;

      for (let i = 0; i < n; i++) {
        const bucket = Math.floor(rng() * 10);
        buckets[bucket]++;
      }

      // Each bucket should have roughly n/10 = 1000 items
      // With 10000 samples, expect each bucket to be within 15% of expected
      const expected = n / 10;
      for (const count of buckets) {
        expect(count).toBeGreaterThan(expected * 0.85);
        expect(count).toBeLessThan(expected * 1.15);
      }
    });
  });

  describe('randInt', () => {
    it('produces values within specified range (inclusive)', () => {
      const rng = createRng(42);

      for (let i = 0; i < 1000; i++) {
        const val = randInt(rng, 5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('produces deterministic results with same seed', () => {
      const rng1 = createRng(123);
      const rng2 = createRng(123);

      const vals1 = Array.from({ length: 20 }, () => randInt(rng1, 0, 100));
      const vals2 = Array.from({ length: 20 }, () => randInt(rng2, 0, 100));

      expect(vals1).toEqual(vals2);
    });
  });

  describe('shuffle', () => {
    it('preserves all elements', () => {
      const rng = createRng(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(rng, original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('does not mutate original array', () => {
      const rng = createRng(42);
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      shuffle(rng, original);

      expect(original).toEqual(copy);
    });

    it('produces deterministic results with same seed', () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const shuffled1 = shuffle(rng1, arr);
      const shuffled2 = shuffle(rng2, arr);

      expect(shuffled1).toEqual(shuffled2);
    });
  });

  describe('choice', () => {
    it('returns element from array', () => {
      const rng = createRng(42);
      const arr = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 100; i++) {
        const chosen = choice(rng, arr);
        expect(arr).toContain(chosen);
      }
    });

    it('produces deterministic results with same seed', () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const arr = ['x', 'y', 'z'];

      const choices1 = Array.from({ length: 10 }, () => choice(rng1, arr));
      const choices2 = Array.from({ length: 10 }, () => choice(rng2, arr));

      expect(choices1).toEqual(choices2);
    });
  });
});
