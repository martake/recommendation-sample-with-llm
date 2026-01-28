import { describe, it, expect } from 'vitest';
import { generateItems, COLOR_HEX } from './items';

describe('items', () => {
  describe('generateItems', () => {
    it('generates exactly 30 items (10 per color)', () => {
      const items = generateItems();
      expect(items).toHaveLength(30);
    });

    it('generates 10 items for each color', () => {
      const items = generateItems();

      const redItems = items.filter((item) => item.color === 'R');
      const greenItems = items.filter((item) => item.color === 'G');
      const blueItems = items.filter((item) => item.color === 'B');

      expect(redItems).toHaveLength(10);
      expect(greenItems).toHaveLength(10);
      expect(blueItems).toHaveLength(10);
    });

    it('generates unique itemIds', () => {
      const items = generateItems();
      const ids = items.map((item) => item.itemId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(items.length);
    });

    it('generates items with count 1-10 for each color', () => {
      const items = generateItems();

      for (const color of ['R', 'G', 'B'] as const) {
        const colorItems = items.filter((item) => item.color === color);
        const counts = colorItems.map((item) => item.count).sort((a, b) => a - b);
        expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      }
    });

    it('generates items with correct itemId format', () => {
      const items = generateItems();

      for (const item of items) {
        expect(item.itemId).toMatch(/^[RGB]-\d+$/);
        // Verify itemId matches color and count
        const [color, count] = item.itemId.split('-');
        expect(color).toBe(item.color);
        expect(parseInt(count)).toBe(item.count);
      }
    });

    it('is deterministic (no randomness)', () => {
      const items1 = generateItems();
      const items2 = generateItems();

      expect(items1).toEqual(items2);
    });
  });

  describe('COLOR_HEX', () => {
    it('has correct hex values for each color', () => {
      expect(COLOR_HEX.R).toBe('#FF0000');
      expect(COLOR_HEX.G).toBe('#00FF00');
      expect(COLOR_HEX.B).toBe('#0000FF');
    });
  });
});
