export const CATEGORIES = {
  Food: { color: '#E24B4A', icon: '🍔', keywords: ['zomato', 'swiggy', 'food', 'restaurant', 'cafe', 'pizza', 'burger', 'meal', 'dining', 'eat'] },
  Travel: { color: '#378ADD', icon: '🚗', keywords: ['uber', 'ola', 'rapido', 'irctc', 'train', 'flight', 'bus', 'metro', 'travel', 'taxi', 'cab'] },
  Subscriptions: { color: '#7F77DD', icon: '📱', keywords: ['netflix', 'spotify', 'amazon prime', 'hotstar', 'youtube', 'subscription', 'prime'] },
  Groceries: { color: '#1D9E75', icon: '🛒', keywords: ['big bazaar', 'dmart', 'reliance fresh', 'grocery', 'groceries', 'supermarket', 'kirana', 'vegetables'] },
  Shopping: { color: '#EF9F27', icon: '🛍️', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'purchase', 'order'] },
  Bills: { color: '#5F5E5A', icon: '⚡', keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'jio', 'airtel', 'vi', 'bill', 'recharge'] },
  Income: { color: '#26c28f', icon: '💼', keywords: ['salary', 'income', 'credit', 'dividend', 'refund'] },
  Other: { color: '#D4537E', icon: '💰', keywords: [] },
};

export function categorize(description) {
  const lower = description.toLowerCase();
  for (const [cat, data] of Object.entries(CATEGORIES)) {
    if (cat === 'Other') continue;
    if (data.keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

export function enrichTransactions(raw) {
  return raw.map(t => ({
    ...t,
    amount: parseFloat(t.amount),
    date: new Date(t.date),
    category: categorize(t.description),
  }));
}

export function groupByCategory(transactions) {
  const map = {};
  for (const t of transactions) {
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value), color: CATEGORIES[name]?.color || '#888' }))
    .sort((a, b) => b.value - a.value);
}

export function groupByMonth(transactions) {
  const map = {};
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    const label = t.date.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!map[key]) map[key] = { key, label, total: 0, breakdown: {} };
    map[key].total += t.amount;
    map[key].breakdown[t.category] = (map[key].breakdown[t.category] || 0) + t.amount;
  }
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}

export function generateInsights(transactions) {
  const insights = [];
  const months = groupByMonth(transactions);
  if (months.length < 2) return insights;

  const latest = months[months.length - 1];
  const prev = months[months.length - 2];

  for (const cat of Object.keys(CATEGORIES)) {
    const latestAmt = latest.breakdown[cat] || 0;
    const prevAmt = prev.breakdown[cat] || 0;
    if (prevAmt > 0 && latestAmt > prevAmt) {
      const pct = Math.round(((latestAmt - prevAmt) / prevAmt) * 100);
      if (pct >= 20) {
        insights.push({
          type: 'spike',
          category: cat,
          message: `${cat} spending rose ${pct}% vs last month`,
          detail: `₹${Math.round(prevAmt).toLocaleString()} → ₹${Math.round(latestAmt).toLocaleString()}`,
          savings: Math.round((latestAmt - prevAmt) * 0.5),
          icon: CATEGORIES[cat]?.icon,
        });
      }
    }
  }

  const byCat = groupByCategory(transactions);
  const top = byCat[0];
  if (top) {
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const pct = Math.round((top.value / total) * 100);
    if (pct > 30) {
      insights.push({
        type: 'dominant',
        category: top.name,
        message: `${top.name} is ${pct}% of all spending`,
        detail: `₹${top.value.toLocaleString()} total`,
        savings: Math.round(top.value * 0.15),
        icon: CATEGORIES[top.name]?.icon,
      });
    }
  }

  const subCats = ['Subscriptions'];
  for (const cat of subCats) {
    const amt = groupByCategory(transactions).find(c => c.name === cat)?.value || 0;
    if (amt > 1000) {
      insights.push({
        type: 'subscription',
        category: cat,
        message: `₹${amt.toLocaleString()} on subscriptions detected`,
        detail: 'Review unused services',
        savings: Math.round(amt * 0.3),
        icon: CATEGORIES[cat]?.icon,
      });
    }
  }

  return insights;
}
