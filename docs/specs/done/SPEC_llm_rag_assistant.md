# LLM Assistant with RAG (Rule-Aware Insight Generator)
## 開発依頼書（ClaudeCode向け / React + WebLLM + Python RAG前処理）

（本仕様は、既存の Synthetic Recommender Benchmark に **LLMアシスタント機能**を追加するためのものです。
LLMは WebLLM（ブラウザ内 Llama）を使用し、**RAGはPythonで事前構築**します。）

---

## 0. 目的

- 推薦結果・評価指標に対して、**LLMが根拠付きで解説するアシスタント**を実装する
- LLMは「購買ルール」「評価指標の意味」「実験条件」を理解した上で説明を行う
- ルール理解は **RAG（Retrieval Augmented Generation）** によって行う
- サーバレス構成（GitHub Pages + ブラウザ内LLM）を維持する

---

## 1. 全体アーキテクチャ

```text
[ rules.md / docs/*.md ]
            |
            |  (Python前処理)
            v
[ chunks.json + embeddings.json ]
            |
            |  (同梱 / static assets)
            v
[ React App ]
   ├─ RAG Retriever（cos類似）
   ├─ Prompt Builder
   ├─ LangChain RunnableSequence
   └─ WebLLM (Llama)
```

---

## 2. RAG対象ドキュメント

### 2.1 ドキュメント種別
- `rules.md`
  - 購買ルール（RGB閾値）
  - 推論プロトコル
  - 評価指標定義
- `metrics.md`（任意）
  - purchase_rate / 分布 / 多様性の解釈
- `experiment.md`（任意）
  - このシミュレーションの前提・制約

※ 最初は `rules.md` のみでも可

---

## 3. Python側：RAG前処理

### 3.1 入力
- Markdown ドキュメント（上記）

### 3.2 処理内容
1. Markdown をセクション単位でチャンク化
2. 各チャンクにメタデータ付与
3. 各チャンクを embedding 化
4. 成果物を JSON として出力

---

## 4. フロントエンド：RAG Retriever（TS）

- cosine similarity で Top-K（K=3〜5）取得
- 選択チャンクをプロンプトに挿入

---

## 5. LLMアシスタント

- LangChain.js 使用
- RAGチャンク + 数値結果を根拠に説明生成

---

## 6. Promptモード

- Good / Bad / Custom
- Custom は UI 編集可

---

## 7. UI

- Insight Panel
- RAG根拠表示
- Prompt/Model 切替

---

## 8. WebLLM

- Llama系軽量モデル
- WebWorker実行
- モデルDL進捗表示

---

## 9. 完了条件

- RAG前処理（Python）
- フロントRAG検索
- LLM説明生成
- Pagesで動作

---

以上
