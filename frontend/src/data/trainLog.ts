import type { Item, LogEntry, User } from '../types';
import type { Rng } from '../utils/random';
import { choice } from '../utils/random';

export function shouldPurchase(user: User, item: Item, threshold: number): boolean {
  switch (item.color) {
    case 'R': return user.r >= threshold;
    case 'G': return user.g >= threshold;
    case 'B': return user.b >= threshold;
  }
}

export function generateTrainLogs(
  rng: Rng,
  users: User[],
  items: Item[],
  threshold: number,
  proposalsPerUser: number = 10,
): LogEntry[] {
  const logs: LogEntry[] = [];
  for (const user of users) {
    for (let i = 0; i < proposalsPerUser; i++) {
      const item = choice(rng, items);
      logs.push({
        userId: user.userId,
        itemId: item.itemId,
        shownIndex: i,
        purchased: shouldPurchase(user, item, threshold),
      });
    }
  }
  return logs;
}
