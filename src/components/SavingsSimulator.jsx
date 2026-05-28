import { useState } from 'react';
import { groupByCategory } from '../utils/insights';

export default function SavingsSimulator({ transactions }) {
  const byCategory = groupByCategory(transactions);
  const [reductions, setReductions] = useState({});

  const totalSavings = byCategory.reduce((sum, cat) => {
    const pct = reductions[cat.name] || 0;
    return sum + Math.round(cat.value * (pct / 100));
  }, 0);

  return (
    <div className="simulator-section">
      <h3 className="section-title">🎯 Savings Simulator</h3>
      <p className="section-sub">Drag to simulate how much you could save by reducing each category</p>
      <div className="simulator-card">
        {byCategory.map(cat => {
          const pct = reductions[cat.name] || 0;
          const saved = Math.round(cat.value * (pct / 100));
          return (
            <div key={cat.name} className="sim-row">
              <div className="sim-label">
                <span>{cat.name}</span>
                <span className="sim-original">₹{cat.value.toLocaleString()}</span>
              </div>
              <div className="sim-slider-row">
                <input
                  type="range" min="0" max="60" step="1"
                  value={pct}
                  onChange={e => setReductions(r => ({ ...r, [cat.name]: +e.target.value }))}
                  className="sim-slider"
                  style={{ '--pct': pct, accentColor: pct > 0 ? '#1D9E75' : '#888' }}
                />
                <span className="sim-pct">{pct}%</span>
                {saved > 0 && <span className="sim-saved">-₹{saved.toLocaleString()}</span>}
              </div>
            </div>
          );
        })}
        <div className="sim-total">
          <span>Projected Monthly Savings</span>
          <span className="sim-total-val">₹{totalSavings.toLocaleString()}</span>
        </div>
        {totalSavings > 0 && (
          <div className="sim-yearly">
            📅 That's <strong>₹{(totalSavings * 12).toLocaleString()}/year</strong> — enough to invest in a mutual fund SIP!
          </div>
        )}
      </div>
    </div>
  );
}
