import type {
  Color,
  InferenceResult,
  Item,
  LogEntry,
  MFModel,
  Metrics,
  User,
} from '../types';
import type { Rng } from '../utils/random';
import { choice } from '../utils/random';
import { shouldPurchase } from '../data/trainLog';
import { adaptUserOnline, scoreItems } from '../models/matrixFactorization';
import {
  recommendBySimilarity,
  type SimilarityMatrix,
} from '../models/itemSimilarity';

const PROPOSALS_PER_USER = 10;

function computeMetrics(
  logs: LogEntry[],
  items: Item[],
  nUsers: number,
): Metrics {
  const itemMap = new Map<string, Item>();
  items.forEach((it) => itemMap.set(it.itemId, it));

  const userPurchases = new Map<string, number>();
  const colorBreakdown: Record<Color, number> = { R: 0, G: 0, B: 0 };
  let totalPurchases = 0;

  for (const log of logs) {
    if (log.purchased) {
      totalPurchases++;
      const cur = userPurchases.get(log.userId) ?? 0;
      userPurchases.set(log.userId, cur + 1);
      const item = itemMap.get(log.itemId);
      if (item) colorBreakdown[item.color]++;
    } else {
      if (!userPurchases.has(log.userId)) {
        userPurchases.set(log.userId, 0);
      }
    }
  }

  const histogram = new Array(PROPOSALS_PER_USER + 1).fill(0);
  // Include users with 0 purchases
  const allUserIds = new Set(logs.map((l) => l.userId));
  for (const uid of allUserIds) {
    const cnt = userPurchases.get(uid) ?? 0;
    histogram[cnt]++;
  }

  const purchasedUsers = Array.from(userPurchases.values()).filter(
    (c) => c > 0,
  ).length;

  return {
    purchaseRate: totalPurchases / (nUsers * PROPOSALS_PER_USER),
    purchasedUsers,
    avgPurchasesPerUser: totalPurchases / nUsers,
    totalPurchases,
    colorBreakdown,
    histogram,
  };
}

function runRandom(
  rng: Rng,
  users: User[],
  items: Item[],
  threshold: number,
): LogEntry[] {
  const logs: LogEntry[] = [];
  for (const user of users) {
    for (let i = 0; i < PROPOSALS_PER_USER; i++) {
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

function runMemoryBased(
  rng: Rng,
  users: User[],
  items: Item[],
  threshold: number,
  sim: SimilarityMatrix,
): LogEntry[] {
  const logs: LogEntry[] = [];

  for (const user of users) {
    const purchasedIndices = new Set<number>();
    const proposedThisUser = new Set<number>();

    for (let i = 0; i < PROPOSALS_PER_USER; i++) {
      let itemIdx: number;

      if (i === 0 || purchasedIndices.size === 0) {
        // Random first proposal or if nothing purchased yet
        itemIdx = Math.floor(rng() * items.length);
      } else {
        // Recommend based on similarity
        const ranked = recommendBySimilarity(purchasedIndices, sim, items.length);
        // Pick the highest-ranked item not yet proposed
        const candidate = ranked.find((idx) => !proposedThisUser.has(idx));
        itemIdx = candidate !== undefined ? candidate : Math.floor(rng() * items.length);
      }

      proposedThisUser.add(itemIdx);
      const item = items[itemIdx];
      const purchased = shouldPurchase(user, item, threshold);
      if (purchased) purchasedIndices.add(itemIdx);

      logs.push({
        userId: user.userId,
        itemId: item.itemId,
        shownIndex: i,
        purchased,
      });
    }
  }
  return logs;
}

function runModelBased(
  rng: Rng,
  users: User[],
  items: Item[],
  threshold: number,
  model: MFModel,
): LogEntry[] {
  const logs: LogEntry[] = [];
  const itemIndex = new Map<string, number>();
  items.forEach((it, i) => itemIndex.set(it.itemId, i));

  for (const user of users) {
    // Initialize random user embedding
    let userVec = Array.from({ length: model.k }, () => (rng() - 0.5) * 0.1);
    const proposedThisUser = new Set<number>();

    for (let i = 0; i < PROPOSALS_PER_USER; i++) {
      let itemIdx: number;

      if (i === 0) {
        itemIdx = Math.floor(rng() * items.length);
      } else {
        // Score all items and pick best unproposed
        const scores = scoreItems(userVec, model);
        let bestIdx = -1;
        let bestScore = -Infinity;
        for (let j = 0; j < items.length; j++) {
          if (!proposedThisUser.has(j) && scores[j] > bestScore) {
            bestScore = scores[j];
            bestIdx = j;
          }
        }
        itemIdx = bestIdx >= 0 ? bestIdx : Math.floor(rng() * items.length);
      }

      proposedThisUser.add(itemIdx);
      const item = items[itemIdx];
      const purchased = shouldPurchase(user, item, threshold);

      // Online adaptation
      userVec = adaptUserOnline(userVec, model, itemIdx, purchased);

      logs.push({
        userId: user.userId,
        itemId: item.itemId,
        shownIndex: i,
        purchased,
      });
    }
  }
  return logs;
}

export function runInference(
  rng: Rng,
  inferUsers: User[],
  items: Item[],
  threshold: number,
  model: MFModel,
  sim: SimilarityMatrix,
): InferenceResult[] {
  const randomLogs = runRandom(rng, inferUsers, items, threshold);
  const memoryLogs = runMemoryBased(rng, inferUsers, items, threshold, sim);
  const modelLogs = runModelBased(rng, inferUsers, items, threshold, model);

  return [
    {
      method: 'random',
      logs: randomLogs,
      metrics: computeMetrics(randomLogs, items, inferUsers.length),
    },
    {
      method: 'memory-based',
      logs: memoryLogs,
      metrics: computeMetrics(memoryLogs, items, inferUsers.length),
    },
    {
      method: 'model-based',
      logs: modelLogs,
      metrics: computeMetrics(modelLogs, items, inferUsers.length),
    },
  ];
}
