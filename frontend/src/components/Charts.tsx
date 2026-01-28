import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { InferenceResult, MethodName } from '../types';

interface Props {
  results: InferenceResult[];
}

const METHOD_COLORS: Record<string, string> = {
  random: '#999999',
  'memory-based': '#4CAF50',
  'model-based': '#2196F3',
};

export const Charts: React.FC<Props> = ({ results }) => {
  const { t } = useTranslation();

  const getMethodLabel = (method: MethodName) => t(`methods.${method}`);

  // Purchase rate bar chart data
  const rateData = results.map((r) => ({
    method: getMethodLabel(r.method),
    purchaseRate: +(r.metrics.purchaseRate * 100).toFixed(1),
    originalMethod: r.method,
  }));

  // Histogram data - use translated method names as keys
  const histData = Array.from({ length: 11 }, (_, i) => {
    const row: Record<string, number | string> = { purchases: String(i) };
    for (const r of results) {
      row[getMethodLabel(r.method)] = r.metrics.histogram[i];
    }
    return row;
  });

  // Color breakdown data
  const colorData = (['R', 'G', 'B'] as const).map((color) => {
    const row: Record<string, number | string> = { color };
    for (const r of results) {
      row[getMethodLabel(r.method)] = r.metrics.colorBreakdown[color];
    }
    return row;
  });

  return (
    <div className="charts">
      <h2>{t('charts.title')}</h2>

      <div className="chart-container">
        <h3>{t('charts.purchaseRate')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="purchaseRate">
              {rateData.map((entry) => (
                <Cell
                  key={entry.originalMethod}
                  fill={METHOD_COLORS[entry.originalMethod] ?? '#8884d8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>{t('charts.histogram')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="purchases"
              label={{ value: t('charts.purchases'), position: 'insideBottom', offset: -5 }}
            />
            <YAxis label={{ value: t('charts.users'), angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {results.map((r) => (
              <Bar
                key={r.method}
                dataKey={getMethodLabel(r.method)}
                fill={METHOD_COLORS[r.method]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>{t('charts.byColor')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={colorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="color" />
            <YAxis />
            <Tooltip />
            <Legend />
            {results.map((r) => (
              <Bar
                key={r.method}
                dataKey={getMethodLabel(r.method)}
                fill={METHOD_COLORS[r.method]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
