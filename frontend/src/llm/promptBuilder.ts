import type { InsightRequest, PromptMode, RAGChunk } from './types';

// English prompts
const SYSTEM_CONTEXT_EN = `You are an AI assistant analyzing recommendation system benchmark results.
You have access to the following knowledge about the system:

{context}

Based on this knowledge, provide clear, concise explanations of the results.
IMPORTANT: You MUST respond in English.`;

const GOOD_PROMPT_EN = `Analyze these recommendation benchmark results and explain why certain methods performed better:

## Results
{results}

## Experiment Settings
- Threshold (T): {threshold}
- Number of inference users: {nInferUsers}

Please provide:
1. A brief summary of which method performed best
2. An explanation of WHY this method outperformed others based on the purchase rules
3. Key insights from the color breakdown if relevant

Keep your response concise and focused on the key findings.`;

const BAD_PROMPT_EN = `Here are some numbers: {results}. What do you think?`;

// Japanese prompts
const SYSTEM_CONTEXT_JA = `あなたは推薦システムのベンチマーク結果を分析するAIアシスタントです。
以下のシステムに関する知識を参照できます：

{context}

この知識に基づいて、結果を分かりやすく簡潔に説明してください。
重要：必ず日本語で回答してください。`;

const GOOD_PROMPT_JA = `以下の推薦ベンチマーク結果を分析し、なぜ特定の方式が優れた性能を示したか説明してください：

## 結果
{results}

## 実験設定
- 閾値 (T): {threshold}
- 推論ユーザー数: {nInferUsers}

以下の内容を含めてください：
1. どの方式が最も良い性能を示したかの要約
2. 購買ルールに基づいて、なぜその方式が他より優れていたかの説明
3. 色別の内訳からの重要な知見（該当する場合）

回答は簡潔に、重要なポイントに絞ってください。`;

const BAD_PROMPT_JA = `これらの数値を見てください: {results}。どう思いますか？`;

export function buildPrompt(
  mode: PromptMode,
  customPrompt: string,
  request: InsightRequest,
  ragChunks: RAGChunk[],
  lang: string = 'en',
): string {
  const isJapanese = lang === 'ja';

  // Build context from RAG chunks
  const context = ragChunks
    .map((chunk) => {
      const headers = chunk.headers.join(' > ');
      return `### ${headers}\n${chunk.text}`;
    })
    .join('\n\n');

  // Format results (localized)
  const resultsText = request.results
    .map((r) =>
      isJapanese
        ? `- ${r.method}: 購入率 ${(r.purchaseRate * 100).toFixed(1)}%, 平均 ${r.avgPurchases.toFixed(2)} 購入/ユーザー`
        : `- ${r.method}: Purchase Rate ${(r.purchaseRate * 100).toFixed(1)}%, Avg ${r.avgPurchases.toFixed(2)} purchases/user`,
    )
    .join('\n');

  // Select prompt template based on mode and language
  let promptTemplate: string;
  switch (mode) {
    case 'good':
      promptTemplate = isJapanese ? GOOD_PROMPT_JA : GOOD_PROMPT_EN;
      break;
    case 'bad':
      promptTemplate = isJapanese ? BAD_PROMPT_JA : BAD_PROMPT_EN;
      break;
    case 'custom':
      promptTemplate = customPrompt || (isJapanese ? GOOD_PROMPT_JA : GOOD_PROMPT_EN);
      break;
  }

  // Build full prompt with system context
  const systemContext = isJapanese ? SYSTEM_CONTEXT_JA : SYSTEM_CONTEXT_EN;
  const systemPrompt = systemContext.replace('{context}', context);

  const userPrompt = promptTemplate
    .replace('{results}', resultsText)
    .replace('{threshold}', String(request.threshold))
    .replace('{nInferUsers}', String(request.nInferUsers));

  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
}

export function getDefaultCustomPrompt(lang: string = 'en'): string {
  return lang === 'ja' ? GOOD_PROMPT_JA : GOOD_PROMPT_EN;
}

export const DEFAULT_CUSTOM_PROMPT = GOOD_PROMPT_EN;
