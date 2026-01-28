export type Color = 'R' | 'G' | 'B';

export interface Item {
  itemId: string;
  color: Color;
  count: number;
}

export interface User {
  userId: string;
  r: number;
  g: number;
  b: number;
}

export interface LogEntry {
  userId: string;
  itemId: string;
  shownIndex: number;
  purchased: boolean;
}

export type MethodName = 'random' | 'memory-based' | 'model-based';

export interface Metrics {
  purchaseRate: number;
  purchasedUsers: number;
  avgPurchasesPerUser: number;
  totalPurchases: number;
  colorBreakdown: Record<Color, number>;
  histogram: number[];
}

export interface InferenceResult {
  method: MethodName;
  logs: LogEntry[];
  metrics: Metrics;
}

export interface MFModel {
  userEmbeddings: number[][];
  itemEmbeddings: number[][];
  k: number;
}
