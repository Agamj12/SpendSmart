import { generateInsights } from '../utils/insights';

const typeConfig = {
  spike: { label: 'Overspending Alert', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', badge: '#EF4444' },
  dominant: { label: 'Top Category', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#F59E0B' },
  subscription: { label: 'Subscription Review', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', badge: '#3B82F6' },
};

export default function InsightCards({ transactions }) {
  const insights = generateInsights(transactions);

  if (!insights.length) return (
    <div className="no-insights">✅ Your spending looks balanced this month!</div>
  );

  return (
    <div className="insights-section">
      <h3 className="section-title">⚡ Smart Insights</h3>
      <div className="insights-grid">
        {insights.map((ins, i) => {
          const cfg = typeConfig[ins.type] || typeConfig.spike;
          return (
            <div key={i} className="insight-card" style={{ background: cfg.bg, borderColor: cfg.border }}>
              <div className="insight-header">
                <span className="insight-badge" style={{ background: cfg.badge }}>
                  {cfg.label}
                </span>
                <span className="insight-icon">{ins.icon}</span>
              </div>
              <p className="insight-msg" style={{ color: cfg.text }}>{ins.message}</p>
              <p className="insight-detail">{ins.detail}</p>
              {ins.savings > 0 && (
                <div className="insight-saving">
                  💡 Potential saving: <strong>₹{ins.savings.toLocaleString()}/month</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
