import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { groupByCategory, groupByMonth, CATEGORIES } from '../utils/insights';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{payload[0].name || payload[0].payload?.name}</p>
        <p className="tooltip-value">₹{payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function SpendingCharts({ transactions }) {
  const byCategory = groupByCategory(transactions);
  const byMonth = groupByMonth(transactions);
  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Spending by Category</h3>
        <p className="chart-sub">Total: ₹{Math.round(total).toLocaleString()}</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
              {byCategory.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="legend-list">
          {byCategory.map((cat) => (
            <div key={cat.name} className="legend-item">
              <span className="legend-dot" style={{ background: cat.color }} />
              <span className="legend-name">{CATEGORIES[cat.name]?.icon} {cat.name}</span>
              <span className="legend-val">₹{cat.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>Monthly Trend</h3>
        <p className="chart-sub">Month-over-month comparison</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            {Object.keys(CATEGORIES).filter(c => c !== 'Other' && c !== 'Income').map((cat) => (
              <Bar key={cat} dataKey={`breakdown.${cat}`} name={cat} stackId="a" fill={CATEGORIES[cat].color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
