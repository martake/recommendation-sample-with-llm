import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { InferenceResult } from '../types';
import type { LLMStatus, PromptMode, RAGChunk } from '../llm/types';
import { loadRAGData, getRelevantChunksForAnalysis } from '../llm/ragRetriever';
import {
  initializeLLM,
  generateResponse,
  isLLMReady,
  getCurrentModelId,
  getModelIdForCurrentLanguage,
} from '../llm/webllmService';
import { buildPrompt, getDefaultCustomPrompt } from '../llm/promptBuilder';

interface Props {
  results: InferenceResult[];
  threshold: number;
  nInferUsers: number;
}

export const LLMAssistant: React.FC<Props> = ({ results, threshold, nInferUsers }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [status, setStatus] = useState<LLMStatus>({ stage: 'idle' });
  const [promptMode, setPromptMode] = useState<PromptMode>('good');
  const [customPrompt, setCustomPrompt] = useState(() => getDefaultCustomPrompt(i18n.language));
  const [response, setResponse] = useState('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [showRAGContext, setShowRAGContext] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');

  const targetModelId = getModelIdForCurrentLanguage(currentLang);
  const loadedModelId = getCurrentModelId();
  const needsModelSwitch = loadedModelId !== null && loadedModelId !== targetModelId;

  // Load RAG data on mount
  useEffect(() => {
    loadRAGData().then(() => {
      const chunks = getRelevantChunksForAnalysis();
      setRagChunks(chunks);
    });
  }, []);

  // Update custom prompt template when language changes
  useEffect(() => {
    setCustomPrompt(getDefaultCustomPrompt(currentLang));
  }, [currentLang]);

  const handleInitLLM = useCallback(async () => {
    try {
      await initializeLLM(setStatus, currentLang);
    } catch {
      // Error already handled in service
    }
  }, [currentLang]);

  const handleGenerate = useCallback(async () => {
    // Check if we need to load or switch model
    if (!isLLMReady() || needsModelSwitch) {
      await handleInitLLM();
      if (!isLLMReady()) return;
    }

    const request = {
      results: results.map((r) => ({
        method: r.method,
        purchaseRate: r.metrics.purchaseRate,
        avgPurchases: r.metrics.avgPurchasesPerUser,
        totalPurchases: r.metrics.totalPurchases,
      })),
      threshold,
      nInferUsers,
    };

    const prompt = buildPrompt(promptMode, customPrompt, request, ragChunks, currentLang);
    setCurrentPrompt(prompt);
    setResponse('');

    try {
      await generateResponse(prompt, setStatus, (token) => {
        setResponse((prev) => prev + token);
      });
    } catch {
      // Error already handled in service
    }
  }, [results, threshold, nInferUsers, promptMode, customPrompt, ragChunks, handleInitLLM, needsModelSwitch, currentLang]);

  const renderStatus = () => {
    switch (status.stage) {
      case 'idle':
        return <span className="status-idle">{t('llm.status.idle')}</span>;
      case 'loading':
        return (
          <span className="status-loading">
            {t('llm.status.loading')} {status.progress?.toFixed(0)}%
            <br />
            <small>{status.message}</small>
          </span>
        );
      case 'ready':
        return <span className="status-ready">{t('llm.status.ready')}</span>;
      case 'generating':
        return <span className="status-generating">{t('llm.status.generating')}</span>;
      case 'error':
        return <span className="status-error">{t('llm.status.error')}: {status.message}</span>;
    }
  };

  return (
    <div className="llm-assistant">
      <h2>{t('llm.title')}</h2>

      <div className="llm-controls">
        <div className="llm-status">
          <strong>{t('llm.model')}:</strong>{' '}
          {loadedModelId ? (
            <>
              {loadedModelId}
              {needsModelSwitch && (
                <span className="model-switch-notice">
                  {' '}→ {targetModelId} ({t('llm.willSwitch')})
                </span>
              )}
            </>
          ) : (
            <span className="model-target">{targetModelId}</span>
          )}
          <br />
          <strong>{t('llm.status.label')}:</strong> {renderStatus()}
        </div>

        <div className="llm-prompt-mode">
          <label>{t('llm.promptMode')}:</label>
          <select
            value={promptMode}
            onChange={(e) => setPromptMode(e.target.value as PromptMode)}
            disabled={status.stage === 'loading' || status.stage === 'generating'}
          >
            <option value="good">{t('llm.promptModes.good')}</option>
            <option value="bad">{t('llm.promptModes.bad')}</option>
            <option value="custom">{t('llm.promptModes.custom')}</option>
          </select>
        </div>

        {promptMode === 'custom' && (
          <div className="llm-custom-prompt">
            <label>{t('llm.customPrompt')}:</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={6}
              disabled={status.stage === 'loading' || status.stage === 'generating'}
            />
            <small>{t('llm.customPromptHint')}</small>
          </div>
        )}

        <div className="llm-actions">
          {(!isLLMReady() || needsModelSwitch) && status.stage === 'idle' && (
            <button onClick={handleInitLLM} className="btn-secondary">
              {needsModelSwitch ? t('llm.switchModel') : t('llm.loadModel')}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={status.stage === 'loading' || status.stage === 'generating' || results.length === 0}
            className="btn-primary"
          >
            {t('llm.generate')}
          </button>
        </div>
      </div>

      {response && (
        <div className="llm-response">
          <h3>{t('llm.insight')}</h3>
          <div className="response-text">{response}</div>
        </div>
      )}

      <div className="llm-debug">
        <button
          className="btn-link"
          onClick={() => setShowRAGContext(!showRAGContext)}
        >
          {showRAGContext ? t('llm.hideRAG') : t('llm.showRAG')} ({ragChunks.length} chunks)
        </button>
        {currentPrompt && (
          <button
            className="btn-link"
            onClick={() => setShowPrompt(!showPrompt)}
          >
            {showPrompt ? t('llm.hidePrompt') : t('llm.showPrompt')}
          </button>
        )}
      </div>

      {showRAGContext && ragChunks.length > 0 && (
        <div className="rag-context">
          <h4>{t('llm.ragContext')}</h4>
          {ragChunks.map((chunk) => (
            <div key={chunk.id} className="rag-chunk">
              <div className="rag-chunk-header">{chunk.headers.join(' > ')}</div>
              <div className="rag-chunk-text">{chunk.text.slice(0, 200)}...</div>
            </div>
          ))}
        </div>
      )}

      {showPrompt && currentPrompt && (
        <div className="prompt-preview">
          <h4>{t('llm.promptPreview')}</h4>
          <pre>{currentPrompt}</pre>
        </div>
      )}
    </div>
  );
};
