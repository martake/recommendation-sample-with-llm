import type { Item, LogEntry } from '../types';

export type SimilarityMatrix = number[][];

export function buildItemSimilarity(
  items: Item[],
  logs: LogEntry[],
): SimilarityMatrix {
  const n = items.length;
  const itemIndex = new Map<string, number>();
  items.forEach((it, i) => itemIndex.set(it.itemId, i));

  // Build user -> purchased items sets
  const userPurchases = new Map<string, Set<number>>();
  for (const log of logs) {
    if (!log.purchased) continue;
    const ii = itemIndex.get(log.itemId);
    if (ii === undefined) continue;
    if (!userPurchases.has(log.userId)) {
      userPurchases.set(log.userId, new Set());
    }
    userPurchases.get(log.userId)!.add(ii);
  }

  // Co-occurrence counts and item purchase counts
  const cooccur = Array.from({ length: n }, () => new Float64Array(n));
  const counts = new Float64Array(n);

  for (const purchased of userPurchases.values()) {
    const arr = Array.from(purchased);
    for (const i of arr) {
      counts[i]++;
      for (const j of arr) {
        if (i !== j) cooccur[i][j]++;
      }
    }
  }

  // Cosine similarity
  const sim: SimilarityMatrix = Array.from({ length: n }, () =>
    new Array(n).fill(0),
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const denom = Math.sqrt(counts[i]) * Math.sqrt(counts[j]);
      if (denom > 0) {
        const s = cooccur[i][j] / denom;
        sim[i][j] = s;
        sim[j][i] = s;
      }
    }
  }

  return sim;
}

export function recommendBySimilarity(
  purchasedIndices: Set<number>,
  sim: SimilarityMatrix,
  nItems: number,
): number[] {
  const scores = new Array(nItems).fill(0);
  for (const pi of purchasedIndices) {
    for (let j = 0; j < nItems; j++) {
      if (!purchasedIndices.has(j)) {
        scores[j] += sim[pi][j];
      }
    }
  }
  // Return item indices sorted by score descending
  return Array.from({ length: nItems }, (_, i) => i)
    .filter((i) => !purchasedIndices.has(i))
    .sort((a, b) => scores[b] - scores[a]);
}
