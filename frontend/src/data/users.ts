import type { User } from '../types';
import type { Rng } from '../utils/random';
import { randInt } from '../utils/random';

export function generateUsers(rng: Rng, count: number, prefix: string): User[] {
  const users: User[] = [];
  for (let i = 0; i < count; i++) {
    users.push({
      userId: `${prefix}${String(i + 1).padStart(4, '0')}`,
      r: randInt(rng, 0, 255),
      g: randInt(rng, 0, 255),
      b: randInt(rng, 0, 255),
    });
  }
  return users;
}
