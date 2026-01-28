import type { Item, LogEntry, MFModel, User } from '../types';
import type { Rng } from '../utils/random';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function initVec(rng: Rng, k: number): number[] {
  return Array.from({ length: k }, () => (rng() - 0.5) * 0.1);
}

export function trainMF(
  rng: Rng,
  trainUsers: User[],
  items: Item[],
  logs: LogEntry[],
  epochs: number,
  k: number = 8,
  lr: number = 0.01,
  reg: number = 0.01,
): MFModel {
  const userIndex = new Map<string, number>();
  trainUsers.forEach((u, i) => userIndex.set(u.userId, i));
  const itemIndex = new Map<string, number>();
  items.forEach((it, i) => itemIndex.set(it.itemId, i));

  const nUsers = trainUsers.length;
  const nItems = items.length;

  const userEmb = Array.from({ length: nUsers }, () => initVec(rng, k));
  const itemEmb = Array.from({ length: nItems }, () => initVec(rng, k));

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const log of logs) {
      const ui = userIndex.get(log.userId);
      const ii = itemIndex.get(log.itemId);
      if (ui === undefined || ii === undefined) continue;

      const target = log.purchased ? 1 : 0;
      const pred = dot(userEmb[ui], itemEmb[ii]);
      const err = target - pred;

      for (let d = 0; d < k; d++) {
        const uv = userEmb[ui][d];
        const iv = itemEmb[ii][d];
        userEmb[ui][d] += lr * (err * iv - reg * uv);
        itemEmb[ii][d] += lr * (err * uv - reg * iv);
      }
    }
  }

  return { userEmbeddings: userEmb, itemEmbeddings: itemEmb, k };
}

export function scoreItems(userVec: number[], model: MFModel): number[] {
  return model.itemEmbeddings.map((iv) => dot(userVec, iv));
}

export function adaptUserOnline(
  userVec: number[],
  model: MFModel,
  itemIdx: number,
  purchased: boolean,
  steps: number = 5,
  lr: number = 0.05,
  reg: number = 0.01,
): number[] {
  const vec = [...userVec];
  const iv = model.itemEmbeddings[itemIdx];
  const target = purchased ? 1 : 0;

  for (let s = 0; s < steps; s++) {
    const pred = dot(vec, iv);
    const err = target - pred;
    for (let d = 0; d < vec.length; d++) {
      vec[d] += lr * (err * iv[d] - reg * vec[d]);
    }
  }
  return vec;
}
