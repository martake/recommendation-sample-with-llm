import { useTranslation } from 'react-i18next';
import type { InferenceResult } from '../types';

interface Props {
  results: InferenceResult[];
  nInferUsers: number;
}

export const ResultsTable: React.FC<Props> = ({ results, nInferUsers }) => {
  const { t } = useTranslation();

  return (
    <div className="results-table">
      <h2>{t('results.title')}</h2>
      <table>
        <thead>
          <tr>
            <th>{t('results.method')}</th>
            <th>{t('results.purchaseRate')}</th>
            <th>{t('results.purchasedUsers')}</th>
            <th>{t('results.avgPurchases')}</th>
            <th>{t('results.totalPurchases')}</th>
            <th>R</th>
            <th>G</th>
            <th>B</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.method}>
              <td>{t(`methods.${r.method}`)}</td>
              <td>{(r.metrics.purchaseRate * 100).toFixed(1)}%</td>
              <td>
                {r.metrics.purchasedUsers} / {nInferUsers}
              </td>
              <td>{r.metrics.avgPurchasesPerUser.toFixed(2)}</td>
              <td>{r.metrics.totalPurchases}</td>
              <td>{r.metrics.colorBreakdown.R}</td>
              <td>{r.metrics.colorBreakdown.G}</td>
              <td>{r.metrics.colorBreakdown.B}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
