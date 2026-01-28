# Synthetic Recommender Benchmark (No External Data)

## 開発依頼書（ClaudeCode向け / React + Docker + GitHub Pages）

（この仕様は **外部データ不使用**。データ生成→学習→推論→評価/可視化までを一気通貫で行う、推薦アルゴ比較デモです。LLM機能は今回は含めません。）

---

## 0. 目的

- 合成データ（ユーザ×アイテム購買ログ）を生成し、推薦方式の比較を行う。
- 方式：**モデルベース協調フィルタリング / メモリベース協調フィルタリング / ランダム**
- 推論データに対して「提案→ユーザが購入する確率/件数」がどれだけ変わるかを **数値 + グラフ**で比較する。
- 実行環境：**React + TypeScript + Vite**（GitHub Pagesで配布）
- 開発環境：**Docker / docker-compose**（再現可能）
- 学習と推論はブラウザ内で実行（サーバ不要）

---

## 1. データ仕様

### 1.1 アイテムベース（固定）

- 属性：
  - `color ∈ {R, G, B}`（それぞれRGB固定値）
    - R = `#FF0000`
    - G = `#00FF00`
    - B = `#0000FF`
  - `count ∈ {1..10}`
- 全アイテム数：`3 * 10 = 30`
- 各アイテムに一意の `itemId` を付与
- 例：
  - `R-1, R-2, ... R-10`
  - `G-1, ... G-10`
  - `B-1, ... B-10`

### 1.2 学習ユーザベース（ランダム生成）

- ユーザ属性：
  - `userRGB = (r, g, b)` それぞれ `0..255` のランダム整数
- `userId` を付与
- ユーザ数 `N_train_users` はUIで指定可能（デフォルト 500）

---

## 2. 学習データ生成（購買行動シミュレーション）

### 2.1 提案（学習ログ生成）

- 各ユーザに対して、アイテムベースから **ランダムに**アイテムを提案する
- 提案回数：**10回/ユーザ**（固定）
- 同一アイテムの再提案：許可（実装オプションでOFF可）

### 2.2 購入判定ルール（正解生成）

- 閾値 `T = 160 (0xA0)`（デフォルト）
- 提案されたアイテムの `color` に応じて、ユーザRGBの対応成分が `>= T` なら購入
  - item.color == R → user.r >= T なら購入
  - item.color == G → user.g >= T なら購入
  - item.color == B → user.b >= T なら購入
- `count` は購入判定に影響しない（将来拡張余地として保持）

### 2.3 生成される学習ログ

- 1レコード例：
  ```json
  {
    "userId": "U001",
    "itemId": "R-7",
    "shownIndex": 3,
    "purchased": true
  }
  ```
- 学習用に「ユーザ×アイテム行列（implicit）」へ変換可能にする
  - `1` = 購入
  - `0` = 非購入（提案された場合のみ0が立つ）

---

## 3. モデル作成（学習）

目的：推論時の比較対象のため、**モデルベース協調フィルタリング**モデルを構築する。

### 3.1 モデルベース（必須）

- 推奨：**Matrix Factorization（implicit）**
  - SGDで user/item embedding を学習（アイテム数30なので軽い）
  - スコア：`dot(userVec, itemVec)`
- 要件：
  - 学習はブラウザ内（JS/TS）で動く
  - エポック数などはUIで調整可能（デフォルト 30）

### 3.2 メモリベース（推論時に使用）

- 推奨：**Item-based CF（Cosine similarity）**
  - 学習ログから「同一ユーザが購入した」共起で item-item 類似度を作る
  - 推論ユーザの履歴に近いアイテムを提案

---

## 4. 推論用データ生成

### 4.1 推論アイテムベース

- 学習と同じ 30 アイテム（固定）

### 4.2 推論ユーザベース（新規ランダム）

- 学習ユーザとは別に `N_infer_users` 生成（デフォルト 200）
- 生成ルールは同じ：`(r,g,b)` ランダム `0..255`

---

## 5. 推論プロトコル（比較の公平性）

推論では「レコメンダが提案 → ユーザが購入判定」を行い、最終的な購入数/率を比較する。

### 5.1 各方式の提案回数

- 各推論ユーザについて **10回提案**（学習と同じ）
- 各回で「1アイテム」を提案し、購入判定で purchased true/false を決める

### 5.2 各方式の提案ロジック

#### A) ランダム

- 30アイテムから一様ランダム

#### B) メモリベース（協調フィルタリング）

推論ユーザは学習ログに存在しないため、**オンライン対話型**で扱う。

- 1回目はランダム提案
- 購入されたアイテムを「推論ユーザの履歴」として蓄積
- 2回目以降は、履歴アイテムに類似したアイテムを優先して提案
- 類似度は学習ログから事前計算した item-item similarity を使用

#### C) モデルベース（協調フィルタリング）

未知ユーザに対して **オンライン適応**を行う。

- 1回目はランダム提案
- 購入/非購入を観測したら、推論ユーザの user-embedding を軽く更新（数ステップSGD）
- 2回目以降は `score(userVec, itemVec)` 最大の（未提案）アイテムを優先

---

## 6. 評価指標（数値 + グラフ）

### 6.1 主要指標（必須）

- `purchase_rate = purchased_count / (N_users * 10)`
- `purchased_users = 購入が1回以上発生した推論ユーザ数`
- `avg_purchases_per_user`

### 6.2 分布（推奨）

- 方式ごとの「ユーザあたり購入回数（0..10）」ヒストグラム
- 方式ごとの購入率を棒グラフで比較

### 6.3 追加（任意）

- 色別購入内訳（R/G/B）
- 提案の多様性（ユニーク itemId 数）

---

## 7. UI仕様（React）

### 7.1 画面（単一ページでも可）

- Controls
  - N_train_users（デフォルト 500）
  - N_infer_users（デフォルト 200）
  - threshold T（デフォルト 160）
  - epochs（デフォルト 30）
  - seed（任意）
  - [Generate Train] [Train Model] [Run Inference]
- Results
  - 指標テーブル（方式×指標）
  - グラフ（棒 / ヒスト）
  - 推論サンプルログ（数ユーザ分）

### 7.2 グラフ

- recharts 推奨

---

## 8. 実行環境（Docker / GitHub Pages）

### 8.1 GitHub Pages

- Vite build
- `vite.config.ts` の `base: '/<repo-name>/'`
- React Router は HashRouter

### 8.2 Docker

#### docker-compose.yml（例）

```yaml
version: "3.9"
services:
  frontend:
    build: ./docker/frontend
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: npm run dev
```

#### docker/frontend/Dockerfile（例）

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]
```

---

## 9. 実装タスク

1. React+Vite+TS 雛形 + Pagesデプロイ手順（README）
2. データ生成（items/users/train logs）
3. モデルベースCF（MF/SGD）学習
4. メモリベースCF（item-item similarity）
5. 推論（10回提案×方式）と指標計算
6. 可視化（棒/ヒスト）

---

## 10. 完了条件（DoD）

- 外部データなしで、Generate→Train→Infer→Compare が一通り動く
- 3方式（model-based / memory-based / random）の購入率差が数値とグラフで確認できる
- Dockerで開発可能
- GitHub Pagesにデプロイ可能

---

以上
