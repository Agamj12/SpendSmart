import { useState } from 'react';
import { groupByCategory, groupByMonth, generateInsights } from '../utils/insights';

export default function AICoach({ transactions, salary }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [apiMode, setApiMode] = useState(() => localStorage.getItem('spendsmart_api_mode') || 'local');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('spendsmart_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  const buildContext = () => {
    const byCategory = groupByCategory(transactions);
    const byMonth = groupByMonth(transactions);
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const insights = generateInsights(transactions);
    const savingsRate = Math.round(((salary - total) / salary) * 100);
    return `
User's financial profile:
- Monthly Salary/Income: ₹${Math.round(salary).toLocaleString()}
- Total spending: ₹${Math.round(total).toLocaleString()}
- Current Savings Rate: ${savingsRate}%
- Spending by category and ratio to salary:
  ${byCategory.map(c => `- ${c.name}: ₹${Math.round(c.value).toLocaleString()} (${Math.round((c.value / salary) * 100)}% of income)`).join('\n  ')}
- Monthly totals: ${byMonth.map(m => `${m.label}: ₹${Math.round(m.total).toLocaleString()}`).join(', ')}
- Key alerts: ${insights.map(i => i.message).join('; ') || 'None'}
`;
  };

  const askGemini = async (prompt, key) => {
    const context = buildContext();
    const fullPrompt = `You are a friendly Indian personal finance coach. Given a user's spending data and salary, give concise, actionable, warm advice. Use ₹ symbol. Keep responses under 250 words. Use bullet points. Be specific with numbers. Highlight savings rate and category spend-to-income percentages, comparing them to healthy limits (e.g. wants < 30%, subscriptions < 2%). Suggest concrete monthly savings amounts and what they would compound to in a 10-year mutual fund SIP (assume 12% average annual return).
Context:
${context}

User Question: ${prompt}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error('Empty response from Gemini');
    return replyText;
  };

  const askClaude = async (prompt, key) => {
    const context = buildContext();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: `You are a friendly Indian personal finance coach. Given a user's spending data and salary, give concise, actionable, warm advice. Use ₹ symbol. Keep responses under 250 words. Use bullet points. Be specific with numbers. Highlight savings rate and category spend-to-income percentages, comparing them to healthy limits (e.g. wants < 30%, subscriptions < 2%). Suggest concrete monthly savings amounts and what they would compound to in a 10-year mutual fund SIP (assume 12% average annual return). Context:\n${context}`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Claude API Error');
    }

    const data = await response.json();
    const replyText = data.content?.find(b => b.type === 'text')?.text;
    if (!replyText) throw new Error('Empty response from Claude');
    return replyText;
  };

  const generateLocalAdvice = (prompt, dataList) => {
    const cleanPrompt = prompt.toLowerCase().trim();
    const total = dataList.reduce((s, t) => s + t.amount, 0);
    const count = dataList.length;

    if (count === 0) {
      return "You don't have any transaction data loaded yet. Please upload a CSV file to get advice.";
    }

    const byCategory = {};
    const catCounts = {};
    dataList.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      catCounts[t.category] = (catCounts[t.category] || 0) + 1;
    });

    const sortedCats = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, count: catCounts[name] || 0 }))
      .sort((a, b) => b.value - a.value);

    const topCat = sortedCats[0] || { name: 'Other', value: 0, count: 0 };
    const secondCat = sortedCats[1] || { name: 'None', value: 0, count: 0 };

    const foodSpend = Math.round(byCategory['Food'] || 0);
    const foodCount = catCounts['Food'] || 0;
    const travelSpend = Math.round(byCategory['Travel'] || 0);
    const travelCount = catCounts['Travel'] || 0;
    const shoppingSpend = Math.round(byCategory['Shopping'] || 0);
    const shoppingCount = catCounts['Shopping'] || 0;
    const subSpend = Math.round(byCategory['Subscriptions'] || 0);
    const subCount = catCounts['Subscriptions'] || 0;
    const billSpend = Math.round(byCategory['Bills'] || 0);
    const billCount = catCounts['Bills'] || 0;
    const grocerySpend = Math.round(byCategory['Groceries'] || 0);
    const groceryCount = catCounts['Groceries'] || 0;

    const discretionaryCats = ['Food', 'Shopping', 'Travel', 'Subscriptions'];
    const disSorted = sortedCats
      .filter(c => discretionaryCats.includes(c.name))
      .sort((a, b) => b.value - a.value);
    const topDis = disSorted[0] || { name: 'Food', value: 0, count: 0 };

    let largestTx = null;
    dataList.forEach(t => {
      if (discretionaryCats.includes(t.category) || t.category === 'Other') {
        if (!largestTx || t.amount > largestTx.amount) {
          largestTx = t;
        }
      }
    });

    const formatTxDate = (date) => {
      return date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'recently';
    };

    // 1. Save more money
    if (cleanPrompt.includes('save') || cleanPrompt.includes('budget') || cleanPrompt.includes('saving')) {
      const savingsRate = Math.round(((salary - total) / salary) * 100);
      let adviceLines = [
        `With a monthly income of **₹${Math.round(salary).toLocaleString()}** and spending **₹${Math.round(total).toLocaleString()}**, your current Savings Rate is **${savingsRate}%**.`,
      ];
      if (savingsRate < 0) {
        adviceLines.push(`⚠️ **Alert**: You are currently in a deficit (spending more than your income). You need to trim expenses immediately to stop the outflow.`);
      } else if (savingsRate < 15) {
        adviceLines.push(`⚠️ **Alert**: Your savings rate is **${savingsRate}%**, which is below the recommended healthy minimum of 15-20%. Let's bump it up.`);
      } else {
        adviceLines.push(`🎉 **Excellent**: You have a healthy savings rate of **${savingsRate}%**! Let's optimize it further.`);
      }

      const topCatRatio = Math.round((topCat.value / salary) * 100);
      adviceLines.push(`• **Optimize ${topCat.name}**: This category consumes **₹${Math.round(topCat.value).toLocaleString()}** (**${topCatRatio}%** of your total income). Trimming this by 15% would free up **₹${Math.round(topCat.value * 0.15).toLocaleString()}** monthly.`);

      if (subSpend > 0) {
        const subRatio = (subSpend / salary) * 100;
        adviceLines.push(`• **Subscription Ratio**: Subscriptions take up **${subRatio.toFixed(1)}%** of your income (recommended limit: under 2%). Canceling unused plans could save **₹${Math.round(subSpend * 0.3).toLocaleString()}**.`);
      }
      if (foodSpend > 3000) {
        const foodRatio = Math.round((foodSpend / salary) * 100);
        adviceLines.push(`• **Dining Out Ratio**: Food delivery is eating **${foodRatio}%** of your monthly income. Cooking at home more can save **₹${Math.round(foodSpend * 0.25).toLocaleString()}**.`);
      }
      
      const potentialMonthlySavings = Math.round((topCat.value * 0.15) + (subSpend * 0.3) + (foodSpend * 0.25));
      const sipFutureValue = Math.round(potentialMonthlySavings * 232.3);
      adviceLines.push(`• **Wealth Compounder**: Redirecting these total savings of **₹${potentialMonthlySavings.toLocaleString()}/month** into a mutual fund SIP (compounding at 12% annually) will grow to approximately **₹${sipFutureValue.toLocaleString()}** in 10 years!`);
      
      return adviceLines.join('\n');
    }

    // 2. Wasteful expense
    if (cleanPrompt.includes('waste') || cleanPrompt.includes('wasteful') || cleanPrompt.includes('biggest') || cleanPrompt.includes('expense') || cleanPrompt.includes('highest') || cleanPrompt.includes('expensive')) {
      const topDisRatio = Math.round((topDis.value / salary) * 100);
      let adviceLines = [
        `Let's analyze your largest areas of discretionary spending relative to your income of **₹${Math.round(salary).toLocaleString()}**:`,
        `• **Discretionary Peak**: Your highest want-based category is **${topDis.name}**, consuming **₹${Math.round(topDis.value).toLocaleString()}** (**${topDisRatio}%** of your income) across **${topDis.count}** payments.`
      ];
      if (largestTx) {
        const txRatio = (largestTx.amount / salary) * 100;
        adviceLines.push(`• **Single Largest Outflow**: You spent **₹${Math.round(largestTx.amount).toLocaleString()}** (**${txRatio.toFixed(1)}%** of income) on **${largestTx.description}** (${formatTxDate(largestTx.date)}).`);
      }
      if (topDisRatio > 10) {
        adviceLines.push(`• **Ratio Warning**: Spending **${topDisRatio}%** of income on **${topDis.name}** is high. Try to cap wants to under 10% of income per category.`);
      }
      if (subSpend > 1000) {
        const subRatio = (subSpend / salary) * 100;
        adviceLines.push(`• **Subscription Leak**: Subscriptions swallow **₹${subSpend.toLocaleString()}** (**${subRatio.toFixed(1)}%** of income). Review if they are all active wants.`);
      }
      return adviceLines.join('\n');
    }

    // 3. 3-month savings plan
    if (cleanPrompt.includes('plan') || cleanPrompt.includes('roadmap') || cleanPrompt.includes('3-month') || cleanPrompt.includes('future') || cleanPrompt.includes('months')) {
      const monthlyTarget = Math.round(salary * 0.15); // target 15% savings
      const threeMonthTarget = Math.round(monthlyTarget * 3);
      const m1Save = Math.round(topCat.value * 0.15);
      const m2Save = Math.round((subSpend * 0.3) + (billSpend * 0.05));
      const m3Save = Math.round(salary * 0.1); // save 10% of income

      const sip10yr = Math.round(monthlyTarget * 232.3);

      return [
        `Here is your personalized 3-Month Savings Roadmap targeting **₹${threeMonthTarget.toLocaleString()}** (15% savings rate):`,
        `• **Month 1: Cut Discretionary Spend (Target: ₹${m1Save.toLocaleString()})**`,
        `  Focus exclusively on trimming **${topCat.name}** (currently **${Math.round((topCat.value / salary) * 100)}%** of your income) by 15% through smart substitutions.`,
        `• **Month 2: Subscription & Bill Cleanup (Target: ₹${Math.max(500, m2Save).toLocaleString()})**`,
        `  Reduce recurring leaks. Cancel 1 unused subscription and optimize bills to save **₹${Math.max(500, m2Save).toLocaleString()}**.`,
        `• **Month 3: Automate Savings (Target: ₹${m3Save.toLocaleString()})**`,
        `  Set up a recurring bank auto-transfer of **₹${m3Save.toLocaleString()}** (10% of income) to your savings account on the 1st of the month.`,
        `• **Wealth Compounder**: Committing to this **₹${monthlyTarget.toLocaleString()}/month** plan yields **₹${sip10yr.toLocaleString()}** in 10 years at 12% interest!`,
      ].join('\n');
    }

    // 4. Compare to healthy habits (50/30/20 Rule)
    if (cleanPrompt.includes('compare') || cleanPrompt.includes('healthy') || cleanPrompt.includes('habits') || cleanPrompt.includes('rule') || cleanPrompt.includes('50/30/20')) {
      const needs = billSpend + grocerySpend;
      const wants = foodSpend + travelSpend + shoppingSpend + subSpend;
      const needsPct = Math.round((needs / salary) * 100) || 0;
      const wantsPct = Math.round((wants / salary) * 100) || 0;
      const remainingPct = Math.max(0, 100 - needsPct - wantsPct);

      let needsFeedback = needsPct > 50 
        ? `This is higher than the recommended 50% limit. Consider options to cook in bulk or optimize utility bills.`
        : `Excellent! Your essentials are well under the 50% threshold at **${needsPct}%** of income.`;
      
      let wantsFeedback = wantsPct > 30
        ? `You are exceeding the 30% wants limit (current: **${wantsPct}%**). Try postponing shopping purchases by 48 hours.`
        : `Great job! Your discretionary spending is well-controlled at **${wantsPct}%** of income.`;

      const automatedSIP = Math.round(salary * 0.2);
      const sip10yr = Math.round(automatedSIP * 232.3);

      return [
        `Here is how your monthly spending of **₹${Math.round(total).toLocaleString()}** maps to the **50/30/20 Rule** based on your **₹${Math.round(salary).toLocaleString()}** income:`,
        `• **Needs (Essentials)**: **₹${needs.toLocaleString()}** (**${needsPct}%** vs 50% target). ${needsFeedback}`,
        `• **Wants (Discretionary)**: **₹${wants.toLocaleString()}** (**${wantsPct}%** vs 30% target). ${wantsFeedback}`,
        `• **Savings (Remaining)**: **${remainingPct}%** of your income remains. A healthy target is 20%.`,
        `• **SIP Goal**: Automating 20% (**₹${automatedSIP.toLocaleString()}/month**) will grow to **₹${sip10yr.toLocaleString()}** in 10 years at 12% returns.`,
      ].join('\n');
    }

    // 5. Custom keyword matches
    if (cleanPrompt.includes('food') || cleanPrompt.includes('zomato') || cleanPrompt.includes('swiggy') || cleanPrompt.includes('eat') || cleanPrompt.includes('restaurant')) {
      const foodRatio = Math.round((foodSpend / salary) * 100);
      const targetSavings = Math.round(foodSpend * 0.35);
      const sipVal = Math.round(targetSavings * 232.3);
      return [
        `🍔 **Food Spending Analysis:**`,
        `• You spent **₹${foodSpend.toLocaleString()}** (**${foodRatio}%** of income) across **${foodCount}** transactions.`,
        `• Average per order: **₹${foodCount ? Math.round(foodSpend / foodCount) : 0}**.`,
        `• **Coach Recommendation**: Try preparing meals at home. Saving 35% on food delivery (**₹${targetSavings.toLocaleString()}/month**) and putting it in a SIP yields **₹${sipVal.toLocaleString()}** in 10 years!`,
      ].join('\n');
    }

    if (cleanPrompt.includes('travel') || cleanPrompt.includes('uber') || cleanPrompt.includes('ola') || cleanPrompt.includes('cab') || cleanPrompt.includes('ride')) {
      const travelRatio = Math.round((travelSpend / salary) * 100);
      return [
        `🚗 **Travel & Ride-Hailing Analysis:**`,
        `• You spent **₹${travelSpend.toLocaleString()}** (**${travelRatio}%** of income) across **${travelCount}** transport transactions.`,
        `• **Coach Recommendation**: Ola/Uber rides add up quickly. Try public transit for routine commutes, or compare rates between services before booking.`,
      ].join('\n');
    }

    if (cleanPrompt.includes('shop') || cleanPrompt.includes('shopping') || cleanPrompt.includes('amazon') || cleanPrompt.includes('flipkart') || cleanPrompt.includes('myntra')) {
      const shopRatio = Math.round((shoppingSpend / salary) * 100);
      const targetSavings = Math.round(shoppingSpend * 0.25);
      const sipVal = Math.round(targetSavings * 232.3);
      return [
        `🛍️ **Shopping & E-Commerce Analysis:**`,
        `• Total spent on online shopping: **₹${shoppingSpend.toLocaleString()}** (**${shopRatio}%** of income) across **${shoppingCount}** transactions.`,
        `• **Coach Recommendation**: Try the **30-day list rule**—wait 30 days before buying non-essential items. Saving 25% (**₹${targetSavings.toLocaleString()}/month**) yields **₹${sipVal.toLocaleString()}** in 10 years!`,
      ].join('\n');
    }

    if (cleanPrompt.includes('subscription') || cleanPrompt.includes('netflix') || cleanPrompt.includes('spotify') || cleanPrompt.includes('prime')) {
      const subRatio = (subSpend / salary) * 100;
      return [
        `📱 **Subscriptions Analysis:**`,
        `• You spent **₹${subSpend.toLocaleString()}** (**${subRatio.toFixed(1)}%** of income) on recurring subscriptions.`,
        `• **Coach Recommendation**: Audit all active subscriptions. Cancel any service you haven't used in the last 3 weeks to bring the ratio under the 2% limit.`,
      ].join('\n');
    }

    // 6. Generic Fallback
    const savingsRate = Math.round(((salary - total) / salary) * 100);
    const topCatRatio = Math.round((topCat.value / salary) * 100);
    const secondCatRatio = Math.round((secondCat.value / salary) * 100);
    return [
      `👋 Hello! I'm your local AI Personal Finance Coach.`,
      `Here is a summary of your **${count}** transactions totalling **₹${Math.round(total).toLocaleString()}** based on your monthly income of **₹${Math.round(salary).toLocaleString()}** (Savings Rate: **${savingsRate}%**):`,
      `• **Top Category**: **${topCat.name}** makes up **${topCatRatio}%** of your total income (₹${Math.round(topCat.value).toLocaleString()}).`,
      `• **Second Category**: **${secondCat.name}** makes up **${secondCatRatio}%** of your total income (₹${Math.round(secondCat.value).toLocaleString()}).`,
      `• **Coach Tip**: Focus your attention on cutting down **${topCat.name}** expenses to see the biggest impact on your savings rate.`,
      `\n*Tip: Connect your own Gemini API Key in the settings gear (top right of this card) to ask me free-form questions!*`,
    ].join('\n');
  };

  const ask = async (prompt) => {
    setLoading(true);
    setAdvice(null);
    
    if (apiMode !== 'local' && !apiKey) {
      const localResult = generateLocalAdvice(prompt, transactions);
      setAdvice(`⚠️ Note: Running in Local Fallback Mode because API Key is missing. Click ⚙️ to add your key.\n\n${localResult}`);
      setLoading(false);
      return;
    }

    if (apiMode === 'local') {
      setTimeout(() => {
        const localResult = generateLocalAdvice(prompt, transactions);
        setAdvice(localResult);
        setLoading(false);
      }, 750);
      return;
    }

    try {
      let result = '';
      if (apiMode === 'gemini') {
        result = await askGemini(prompt, apiKey);
      } else if (apiMode === 'claude') {
        result = await askClaude(prompt, apiKey);
      }
      setAdvice(result);
    } catch (err) {
      console.error(err);
      const localResult = generateLocalAdvice(prompt, transactions);
      setAdvice(`❌ API Error: ${err.message}\n\nFalling back to Local Coach Advice:\n\n${localResult}`);
    }
    setLoading(false);
  };

  const quickPrompts = [
    'How can I save more money this month?',
    'What is my biggest wasteful expense?',
    'Give me a 3-month savings plan',
    'How does my spending compare to healthy habits?',
  ];

  const formatLine = (line) => {
    if (!line) return '';
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const saveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('spendsmart_api_mode', apiMode);
    localStorage.setItem('spendsmart_api_key', apiKey);
    setShowSettings(false);
  };

  return (
    <div className="coach-section">
      <div className="coach-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="section-title">🤖 AI Financial Coach</h3>
          <p className="section-sub">Get expert financial coaching and budgeting advice</p>
        </div>
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text2)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color 0.2s'
          }}
          title="Configure AI Coach Settings"
          onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text2)'}
        >
          ⚙️
        </button>
      </div>

      <div className="coach-card">
        {showSettings ? (
          <form onSubmit={saveSettings} className="coach-settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>Configure AI Coach</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)' }}>Coach Engine Mode</label>
              <select 
                value={apiMode} 
                onChange={(e) => setApiMode(e.target.value)}
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontFamily: 'var(--font)'
                }}
              >
                <option value="local">Local Smart Coach (Free, No Key Needed)</option>
                <option value="gemini">Gemini API (Google Gemini-1.5-Flash)</option>
                <option value="claude">Claude API (Anthropic Claude-3.5-Sonnet)</option>
              </select>
            </div>

            {apiMode !== 'local' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text2)' }}>API Key</label>
                <input 
                  type="password" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${apiMode === 'gemini' ? 'Gemini' : 'Claude'} API Key`}
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border2)',
                    color: 'var(--text)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontFamily: 'var(--font)'
                  }}
                  required
                />
                <span style={{ fontSize: '10px', color: 'var(--text2)' }}>
                  Stored locally in your browser. {apiMode === 'gemini' ? (
                    <span>Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Google AI Studio</a>.</span>
                  ) : (
                    <span>Get a key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Anthropic Console</a>.</span>
                  )}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="submit" 
                className="coach-send" 
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Save
              </button>
              <button 
                type="button" 
                className="btn-reset" 
                onClick={() => setShowSettings(false)}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="coach-mode-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text2)', marginBottom: '12px', background: 'var(--bg3)', padding: '6px 12px', borderRadius: '6px' }}>
            <span>Active Coach: <strong>{apiMode === 'local' ? 'Local Smart Engine' : apiMode === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}</strong></span>
            {apiMode === 'local' && <span style={{ color: 'var(--green)' }}>● Ready (No key required)</span>}
            {apiMode !== 'local' && !apiKey && <span style={{ color: 'var(--red)' }}>● Key missing (click ⚙️ to set)</span>}
            {apiMode !== 'local' && apiKey && <span style={{ color: 'var(--green)' }}>● Connected</span>}
          </div>
        )}

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
            disabled={loading}
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
            <div className="coach-text" style={{ flex: 1 }}>
              {advice.split('\n').map((line, i) => {
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                let cleanLine = line;
                if (isBullet) {
                  // remove bullet marker
                  cleanLine = line.replace(/^\s*[•-]\s*/, '');
                }
                
                return (
                  <p 
                    key={i} 
                    className={isBullet ? 'coach-bullet' : ''}
                  >
                    {isBullet ? '• ' : ''}{formatLine(cleanLine)}
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

