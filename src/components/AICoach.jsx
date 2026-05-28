import { useState } from 'react';
import { groupByCategory, groupByMonth, generateInsights } from '../utils/insights';

export default function AICoach({ transactions }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');

  const buildContext = () => {
    const byCategory = groupByCategory(transactions);
    const byMonth = groupByMonth(transactions);
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const insights = generateInsights(transactions);
    return `
User's financial data summary:
- Total spending: ₹${Math.round(total).toLocaleString()}
- Spending by category: ${byCategory.map(c => `${c.name}: ₹${c.value.toLocaleString()}`).join(', ')}
- Monthly totals: ${byMonth.map(m => `${m.label}: ₹${Math.round(m.total).toLocaleString()}`).join(', ')}
- Key alerts: ${insights.map(i => i.message).join('; ') || 'None'}
`;
  };

  const ask = async (prompt) => {
    setLoading(true);
    setAdvice(null);
    const context = buildContext();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a friendly Indian personal finance coach. Given a user's spending data, give concise, actionable, warm advice. Use ₹ symbol. Keep responses under 200 words. Use bullet points. Be specific with numbers. Mention savings amounts where possible. Context:\n${context}`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === 'text')?.text || 'Could not get advice.';
      setAdvice(text);
    } catch {
      setAdvice('Failed to connect to AI coach. Check your network.');
    }
    setLoading(false);
  };

  const quickPrompts = [
    'How can I save more money this month?',
    'What is my biggest wasteful expense?',
    'Give me a 3-month savings plan',
    'How does my spending compare to healthy habits?',
  ];

  return (
    <div className="coach-section">
      <h3 className="section-title">🤖 AI Financial Coach</h3>
      <p className="section-sub">Ask anything about your spending — powered by Claude AI</p>

      <div className="coach-card">
        <div className="quick-prompts">
          {quickPrompts.map((q, i) => (
            <button key={i} className="quick-btn" onClick={() => ask(q)} disabled={loading}>
              {q}
            </button>
          ))}
        </div>

        <div className="coach-input-row">
          <input
            type="text"
            placeholder="Ask your own question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && question.trim() && ask(question)}
            className="coach-input"
          />
          <button className="coach-send" onClick={() => question.trim() && ask(question)} disabled={loading || !question.trim()}>
            Ask ↗
          </button>
        </div>

        {loading && (
          <div className="coach-loading">
            <div className="typing-dots"><span/><span/><span/></div>
            <p>Your AI coach is analysing your data...</p>
          </div>
        )}

        {advice && !loading && (
          <div className="coach-response">
            <div className="coach-avatar">🤖</div>
            <div className="coach-text">
              {advice.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('•') || line.startsWith('-') ? 'coach-bullet' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
