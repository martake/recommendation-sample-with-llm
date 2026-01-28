import { useTranslation } from 'react-i18next';
import type { Color, InferenceResult, Item, User } from '../types';

interface Props {
  results: InferenceResult[];
  inferUsers: User[];
  items: Item[];
  sampleCount: number;
}

// Item colors - purchased (dark) vs not-purchased (light)
const ITEM_COLORS: Record<Color, { purchased: string; notPurchased: string }> = {
  R: { purchased: '#C62828', notPurchased: '#FFCDD2' },  // dark red / light red
  G: { purchased: '#2E7D32', notPurchased: '#C8E6C9' },  // dark green / light green
  B: { purchased: '#1565C0', notPurchased: '#BBDEFB' },  // dark blue / light blue
};

function getItemColor(itemId: string, purchased: boolean, items: Item[]): string {
  const item = items.find((it) => it.itemId === itemId);
  if (!item) return '#999';
  const colors = ITEM_COLORS[item.color];
  return purchased ? colors.purchased : colors.notPurchased;
}

function getTextColor(itemId: string, purchased: boolean, items: Item[]): string {
  const item = items.find((it) => it.itemId === itemId);
  if (!item) return '#333';
  // Use white text on dark (purchased) backgrounds
  return purchased ? '#fff' : '#333';
}

export const SampleLogs: React.FC<Props> = ({ results, inferUsers, items, sampleCount }) => {
  const { t } = useTranslation();

  // Get unique user IDs from first method's logs
  const userIds = [
    ...new Set(results[0]?.logs.map((l) => l.userId) ?? []),
  ].slice(0, sampleCount);

  if (userIds.length === 0) return null;

  const userMap = new Map(inferUsers.map((u) => [u.userId, u]));

  return (
    <div className="sample-logs">
      <h2>{t('sampleLogs.title')} ({sampleCount} {t('sampleLogs.users')})</h2>
      {userIds.map((uid) => {
        const user = userMap.get(uid);
        return (
          <div key={uid} className="sample-user">
            <div className="sample-user-header">
              <h3>{uid}</h3>
              {user && (
                <div className="user-color-info">
                  <span className="user-rgb">
                    R:{user.r} G:{user.g} B:{user.b}
                  </span>
                  <span
                    className="user-color-swatch"
                    style={{ backgroundColor: `rgb(${user.r}, ${user.g}, ${user.b})` }}
                    title={`RGB(${user.r}, ${user.g}, ${user.b})`}
                  />
                </div>
              )}
            </div>
            <div className="sample-methods">
              {results.map((r) => {
                const userLogs = r.logs.filter((l) => l.userId === uid);
                return (
                  <div key={r.method} className="sample-method">
                    <h4>{t(`methods.${r.method}`)}</h4>
                    <div className="log-items">
                      {userLogs.map((l, i) => (
                        <span
                          key={i}
                          className="log-item"
                          style={{
                            backgroundColor: getItemColor(l.itemId, l.purchased, items),
                            color: getTextColor(l.itemId, l.purchased, items),
                          }}
                          title={l.purchased ? 'Purchased' : 'Not purchased'}
                        >
                          {l.itemId}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
