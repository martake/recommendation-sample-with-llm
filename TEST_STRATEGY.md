# テスト戦略 / Test Strategy

このドキュメントでは、本プロジェクトのテスト戦略と実装について説明します。

## 概要 / Overview

| テストレベル | ツール | 対象 | 実行コマンド |
|-------------|--------|------|--------------|
| TypeScript単体テスト | Vitest | ロジック、ユーティリティ、モデル | `npm test` (frontend/) |
| Python単体テスト | pytest | RAG前処理 | `pytest` (rag/) |
| E2Eテスト | Playwright | ユーザーフロー全体 | `npm test` (e2e/) |

## テストピラミッド / Test Pyramid

```
          ╱╲
         ╱  ╲
        ╱ E2E╲        ← 少数の重要なフロー
       ╱──────╲
      ╱        ╲
     ╱ 統合テスト ╲    ← コンポーネント間の連携
    ╱──────────────╲
   ╱                ╲
  ╱    単体テスト     ╲  ← 多数のロジックテスト
 ╱────────────────────╲
```

## 確率的コードのテスト戦略 / Testing Probabilistic Code

本プロジェクトの推薦システムには確率的な要素が含まれています。以下の戦略でテストを実装しています。

### 1. シード固定テスト (Deterministic with Seed)

同じシード値を使用することで、確率的なコードでも再現可能な結果を得られます。

```typescript
// Example: random.test.ts
it('produces deterministic sequence with same seed', () => {
  const rng1 = createRng(12345);
  const rng2 = createRng(12345);

  const seq1 = Array.from({ length: 10 }, () => rng1());
  const seq2 = Array.from({ length: 10 }, () => rng2());

  expect(seq1).toEqual(seq2);  // 完全一致
});
```

**ポイント:**
- シード値が同じなら、結果は完全に再現可能
- CIでのフレイキーテスト（不安定なテスト）を防止
- デバッグが容易

### 2. 統計的テスト (Statistical Testing)

大量のサンプルで期待される分布に収束することを検証します。

```typescript
// Example: trainLog.test.ts
it('purchase rate converges to expected probability', () => {
  const rng = createRng(42);
  const users = generateUsers(createRng(1), 1000, 'U');  // 大量サンプル
  const items = generateItems();
  const threshold = 128;

  const logs = generateTrainLogs(rng, users, items, threshold, 100);
  const purchaseRate = logs.filter(l => l.purchased).length / logs.length;

  // 期待値: ~0.5 (threshold=128で均一分布の場合)
  // 許容誤差: ±5%
  expect(purchaseRate).toBeGreaterThan(0.45);
  expect(purchaseRate).toBeLessThan(0.55);
});
```

**ポイント:**
- サンプル数を増やすことで分散を減少
- 許容誤差は中心極限定理に基づいて設定
- 期待値の理論的根拠をコメントで明記

### 3. 不変条件テスト (Property-Based / Invariant Testing)

入力に関わらず常に成り立つ性質を検証します。

```typescript
// Example: matrixFactorization.test.ts
it('embeddings have reasonable magnitude', () => {
  const model = trainMF(rng, users, items, logs, 20, 8);

  // 不変条件: 埋め込みが発散しない
  for (const emb of [...model.userEmbeddings, ...model.itemEmbeddings]) {
    for (const val of emb) {
      expect(Math.abs(val)).toBeLessThan(10);
    }
  }
});

// Example: itemSimilarity.test.ts
it('cosine similarity is bounded [0, 1]', () => {
  const sim = buildItemSimilarity(items, logs);

  // 不変条件: コサイン類似度は0以上1以下
  for (let i = 0; i < sim.length; i++) {
    for (let j = 0; j < sim.length; j++) {
      expect(sim[i][j]).toBeGreaterThanOrEqual(0);
      expect(sim[i][j]).toBeLessThanOrEqual(1);
    }
  }
});
```

**ポイント:**
- 数学的性質（範囲、対称性など）を検証
- 実装の正しさを間接的に保証
- ランダム入力でも成り立つべき条件

### 4. 比較テスト (Comparative Testing)

異なる条件下での相対的な結果を比較します。

```typescript
// Example: engine.test.ts
it('intelligent methods outperform random', () => {
  const trials = 5;
  let modelBetter = 0;

  for (let trial = 0; trial < trials; trial++) {
    const results = runInference(...);
    const randomRate = results.find(r => r.method === 'random').metrics.purchaseRate;
    const modelRate = results.find(r => r.method === 'model-based').metrics.purchaseRate;

    if (modelRate > randomRate) modelBetter++;
  }

  // 5回中3回以上でモデルがランダムを上回るべき
  expect(modelBetter).toBeGreaterThanOrEqual(3);
});
```

**ポイント:**
- 絶対値ではなく相対的な優劣を検証
- 複数回試行で信頼性を向上
- アルゴリズムの有効性を統計的に検証

## テストファイル構成 / Test File Structure

```
frontend/
├── src/
│   ├── utils/
│   │   └── random.test.ts       # PRNG、シャッフル
│   ├── data/
│   │   ├── items.test.ts        # アイテム生成
│   │   ├── users.test.ts        # ユーザー生成
│   │   └── trainLog.test.ts     # 購買ルール、ログ生成
│   ├── models/
│   │   ├── matrixFactorization.test.ts  # MFモデル
│   │   └── itemSimilarity.test.ts       # アイテム類似度
│   ├── inference/
│   │   └── engine.test.ts       # 推論エンジン
│   └── llm/
│       ├── ragRetriever.test.ts # RAG検索
│       └── promptBuilder.test.ts # プロンプト構築
└── vitest.config.ts

rag/
├── preprocess.py
├── test_preprocess.py           # Markdownチャンキング
└── requirements.txt

e2e/
├── tests/
│   └── recommendation-flow.spec.ts  # E2Eシナリオ
├── playwright.config.ts
└── package.json
```

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml

jobs:
  test-typescript:   # Vitest
  test-python:       # pytest
  test-e2e:          # Playwright
  build:             # 型チェック & ビルド検証
```

## テスト実行方法 / Running Tests

### TypeScript単体テスト

```bash
# Docker経由
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run test:coverage

# ローカル
cd frontend && npm test
```

### Python単体テスト

```bash
# Docker経由
docker compose --profile test run --rm test-python

# または直接
docker compose run --rm rag-preprocess pytest test_preprocess.py -v

# ローカル
cd rag && pytest test_preprocess.py -v
```

### E2Eテスト

```bash
# 方法1: 手動でfrontendを起動してテスト
docker compose up frontend  # ターミナル1
cd e2e && npm install && npm test  # ターミナル2

# 方法2: webServerで自動起動（ローカルnpm環境が必要）
cd e2e && npm install && npm test

# UIモード（デバッグ用）
cd e2e && npm run test:ui

# ヘッドモード（ブラウザ表示）
cd e2e && npm run test:headed
```

## WebLLMのテスト戦略

WebLLMはWebGPUが必要なため、以下の戦略を採用：

1. **単体テスト**: プロンプト構築、RAG検索などの純粋関数をテスト
2. **E2Eテスト**: LLM生成自体はスキップ（`test.skip`）、UIインタラクションのみテスト
3. **CI環境**: WebGPU非対応のためLLM実行はスキップ

## ベストプラクティス / Best Practices

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **明確なテスト名**: 何をテストしているか一目でわかる名前
3. **Arrange-Act-Assert**: 準備→実行→検証の構造
4. **境界値テスト**: 閾値の境界（128, 127）を明示的にテスト
5. **コメントで理論的根拠**: 期待値の計算根拠をコメント
