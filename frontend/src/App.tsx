import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InferenceResult, Item, LogEntry, MFModel, User } from './types';
import type { SimilarityMatrix } from './models/itemSimilarity';
import { createRng } from './utils/random';
import { generateItems } from './data/items';
import { generateUsers } from './data/users';
import { generateTrainLogs } from './data/trainLog';
import { trainMF } from './models/matrixFactorization';
import { buildItemSimilarity } from './models/itemSimilarity';
import { runInference } from './inference/engine';
import { Controls } from './components/Controls';
import { ResultsTable } from './components/ResultsTable';
import { Charts } from './components/Charts';
import { SampleLogs } from './components/SampleLogs';
import { ThresholdChart } from './components/ThresholdChart';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LLMAssistant } from './components/LLMAssistant';
import './App.css';

type Step = 'idle' | 'generated' | 'trained' | 'inferred';

const App: React.FC = () => {
  const { t } = useTranslation();

  const [nTrainUsers, setNTrainUsers] = useState(500);
  const [nInferUsers, setNInferUsers] = useState(200);
  const [threshold, setThreshold] = useState(160);
  const [epochs, setEpochs] = useState(30);
  const [seed, setSeed] = useState(42);

  const [step, setStep] = useState<Step>('idle');
  const [running, setRunning] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [trainUsers, setTrainUsers] = useState<User[]>([]);
  const [trainLogs, setTrainLogs] = useState<LogEntry[]>([]);
  const [inferUsers, setInferUsers] = useState<User[]>([]);
  const [mfModel, setMfModel] = useState<MFModel | null>(null);
  const [simMatrix, setSimMatrix] = useState<SimilarityMatrix | null>(null);
  const [results, setResults] = useState<InferenceResult[]>([]);

  const handleChangeParam = useCallback((key: string, value: number) => {
    switch (key) {
      case 'nTrainUsers': setNTrainUsers(value); break;
      case 'nInferUsers': setNInferUsers(value); break;
      case 'threshold': setThreshold(value); break;
      case 'epochs': setEpochs(value); break;
      case 'seed': setSeed(value); break;
    }
  }, []);

  const handleGenerate = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const rng = createRng(seed);
      const it = generateItems();
      const tu = generateUsers(rng, nTrainUsers, 'U');
      const tl = generateTrainLogs(rng, tu, it, threshold);

      setItems(it);
      setTrainUsers(tu);
      setTrainLogs(tl);
      setInferUsers([]);
      setMfModel(null);
      setSimMatrix(null);
      setResults([]);
      setStep('generated');
      setRunning(false);
    }, 0);
  }, [seed, nTrainUsers, threshold]);

  const handleTrain = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const rng = createRng(seed + 1000);
      const model = trainMF(rng, trainUsers, items, trainLogs, epochs);
      const sim = buildItemSimilarity(items, trainLogs);

      setMfModel(model);
      setSimMatrix(sim);
      setResults([]);
      setStep('trained');
      setRunning(false);
    }, 0);
  }, [seed, trainUsers, items, trainLogs, epochs]);

  const handleInfer = useCallback(() => {
    if (!mfModel || !simMatrix) return;
    setRunning(true);
    setTimeout(() => {
      const rng = createRng(seed + 2000);
      const iu = generateUsers(rng, nInferUsers, 'I');
      const inferRng = createRng(seed + 3000);
      const res = runInference(inferRng, iu, items, threshold, mfModel, simMatrix);

      setInferUsers(iu);
      setResults(res);
      setStep('inferred');
      setRunning(false);
    }, 0);
  }, [seed, nInferUsers, items, threshold, mfModel, simMatrix]);

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <Controls
        nTrainUsers={nTrainUsers}
        nInferUsers={nInferUsers}
        threshold={threshold}
        epochs={epochs}
        seed={seed}
        step={step}
        running={running}
        onChangeParam={handleChangeParam}
        onGenerate={handleGenerate}
        onTrain={handleTrain}
        onInfer={handleInfer}
      />

      {step !== 'idle' && (
        <div className="data-summary">
          <h2>{t('dataSummary.title')}</h2>
          <p>
            {t('dataSummary.items')}: {items.length} | {t('dataSummary.trainUsers')}: {trainUsers.length} | {t('dataSummary.trainLogs')}: {trainLogs.length}
          </p>
          <p>
            {t('dataSummary.trainPurchaseRate')}:{' '}
            {(
              (trainLogs.filter((l) => l.purchased).length / trainLogs.length) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <ThresholdChart
            trainUsers={trainUsers}
            inferUsers={inferUsers}
            threshold={threshold}
          />
          <ResultsTable results={results} nInferUsers={nInferUsers} />
          <LLMAssistant
            results={results}
            threshold={threshold}
            nInferUsers={nInferUsers}
          />
          <Charts results={results} />
          <SampleLogs
            results={results}
            inferUsers={inferUsers}
            items={items}
            sampleCount={3}
          />
        </>
      )}
    </div>
  );
};

export default App;
