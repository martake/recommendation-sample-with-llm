import type { Color, Item } from '../types';

const COLORS: Color[] = ['R', 'G', 'B'];

export function generateItems(): Item[] {
  const items: Item[] = [];
  for (const color of COLORS) {
    for (let count = 1; count <= 10; count++) {
      items.push({
        itemId: `${color}-${count}`,
        color,
        count,
      });
    }
  }
  return items;
}

export const COLOR_HEX: Record<Color, string> = {
  R: '#FF0000',
  G: '#00FF00',
  B: '#0000FF',
};
