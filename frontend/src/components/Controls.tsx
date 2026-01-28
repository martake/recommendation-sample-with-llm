import { useTranslation } from 'react-i18next';

interface Props {
  nTrainUsers: number;
  nInferUsers: number;
  threshold: number;
  epochs: number;
  seed: number;
  step: 'idle' | 'generated' | 'trained' | 'inferred';
  running: boolean;
  onChangeParam: (key: string, value: number) => void;
  onGenerate: () => void;
  onTrain: () => void;
  onInfer: () => void;
}

export const Controls: React.FC<Props> = ({
  nTrainUsers,
  nInferUsers,
  threshold,
  epochs,
  seed,
  step,
  running,
  onChangeParam,
  onGenerate,
  onTrain,
  onInfer,
}) => {
  const { t } = useTranslation();

  return (
    <div className="controls">
      <h2>{t('controls.title')}</h2>
      <div className="control-grid">
        <label>
          {t('controls.trainUsers')}
          <input
            type="number"
            value={nTrainUsers}
            min={10}
            max={5000}
            onChange={(e) => onChangeParam('nTrainUsers', Number(e.target.value))}
            disabled={running}
          />
        </label>
        <label>
          {t('controls.inferUsers')}
          <input
            type="number"
            value={nInferUsers}
            min={10}
            max={2000}
            onChange={(e) => onChangeParam('nInferUsers', Number(e.target.value))}
            disabled={running}
          />
        </label>
        <label>
          {t('controls.threshold')}
          <input
            type="number"
            value={threshold}
            min={0}
            max={255}
            onChange={(e) => onChangeParam('threshold', Number(e.target.value))}
            disabled={running}
          />
        </label>
        <label>
          {t('controls.epochs')}
          <input
            type="number"
            value={epochs}
            min={1}
            max={200}
            onChange={(e) => onChangeParam('epochs', Number(e.target.value))}
            disabled={running}
          />
        </label>
        <label>
          {t('controls.seed')}
          <input
            type="number"
            value={seed}
            min={0}
            onChange={(e) => onChangeParam('seed', Number(e.target.value))}
            disabled={running}
          />
        </label>
      </div>
      <div className="control-buttons">
        <button onClick={onGenerate} disabled={running}>
          {t('controls.generateTrain')}
        </button>
        <button
          onClick={onTrain}
          disabled={running || step === 'idle'}
        >
          {t('controls.trainModel')}
        </button>
        <button
          onClick={onInfer}
          disabled={running || step !== 'trained'}
        >
          {t('controls.runInference')}
        </button>
      </div>
      {running && <p className="status-msg">{t('controls.processing')}</p>}
    </div>
  );
};
