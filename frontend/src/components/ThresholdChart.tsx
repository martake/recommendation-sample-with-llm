import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Color, User } from '../types';

interface Props {
  trainUsers: User[];
  inferUsers: User[];
  threshold: number;
}

const COLOR_LABELS: Record<Color, string> = {
  R: 'Red (R)',
  G: 'Green (G)',
  B: 'Blue (B)',
};

function calcAboveThreshold(users: User[], threshold: number): Record<Color, number> {
  if (users.length === 0) return { R: 0, G: 0, B: 0 };

  let rCount = 0, gCount = 0, bCount = 0;
  for (const u of users) {
    if (u.r >= threshold) rCount++;
    if (u.g >= threshold) gCount++;
    if (u.b >= threshold) bCount++;
  }
  return {
    R: (rCount / users.length) * 100,
    G: (gCount / users.length) * 100,
    B: (bCount / users.length) * 100,
  };
}

export const ThresholdChart: React.FC<Props> = ({ trainUsers, inferUsers, threshold }) => {
  const { t } = useTranslation();

  const trainStats = calcAboveThreshold(trainUsers, threshold);
  const inferStats = calcAboveThreshold(inferUsers, threshold);

  const data = (['R', 'G', 'B'] as const).map((color) => ({
    color: COLOR_LABELS[color],
    [t('thresholdChart.train')]: +trainStats[color].toFixed(1),
    [t('thresholdChart.infer')]: +inferStats[color].toFixed(1),
  }));

  const trainKey = t('thresholdChart.train');
  const inferKey = t('thresholdChart.infer');

  return (
    <div className="threshold-chart">
      <h2>{t('thresholdChart.title')} (T={threshold})</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="color" />
          <YAxis
            domain={[0, 100]}
            label={{ value: t('thresholdChart.percentage'), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
          <Legend />
          <Bar dataKey={trainKey} fill="#5C6BC0" />
          <Bar dataKey={inferKey} fill="#FF7043" />
        </BarChart>
      </ResponsiveContainer>
      <p className="threshold-note">
        {t('thresholdChart.train')}: N={trainUsers.length} / {t('thresholdChart.infer')}: N={inferUsers.length}
      </p>
    </div>
  );
};
