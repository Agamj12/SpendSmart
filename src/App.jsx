import { useState } from 'react';
import UploadZone from './components/UploadZone';
import SpendingCharts from './components/SpendingCharts';
import InsightCards from './components/InsightCards';
import SavingsSimulator from './components/SavingsSimulator';
import AICoach from './components/AICoach';
import './App.css';

export default function App() {
  const [transactions, setTransactions] = useState(null);
  const [salary, setSalary] = useState(() => {
    const saved = localStorage.getItem('spendsmart_salary');
    return saved ? Number(saved) : 0;
  });

  const reset = () => {
    setTransactions(null);
  };
  
  const spendingTransactions = transactions ? transactions.filter(t => t.category !== 'Income') : [];
  const incomeTransactions = transactions ? transactions.filter(t => t.category === 'Income') : [];

  const total = spendingTransactions.length ? Math.round(spendingTransactions.reduce((s, t) => s + t.amount, 0)) : 0;
  
  const detectedSalary = (() => {
    if (!incomeTransactions.length) return 0;
    const monthlyIncome = {};
    incomeTransactions.forEach(t => {
      const month = t.date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
    });
    const months = Object.keys(monthlyIncome);
    return months.length ? Math.round(monthlyIncome[months[months.length - 1]]) : 0;
  })();

  const currentSalary = salary || detectedSalary || (transactions ? Math.max(50000, Math.round((total * 1.3) / 10000) * 10000) : 50000);
  const savingsRate = currentSalary > 0 ? Math.round(((currentSalary - total) / currentSalary) * 100) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="logo-icon">💎</span>
          <div>
            <h1>SpendSmart</h1>
            <p>AI-Powered Financial Wellness Engine</p>
          </div>
        </div>
        {transactions && (
          <div className="header-meta">
            <div className="header-stat">
              <span className="stat-label">Transactions</span>
              <span className="stat-val">{transactions.length}</span>
            </div>
            <div className="header-stat">
              <span className="stat-label">Total Spend</span>
              <span className="stat-val">₹{total.toLocaleString()}</span>
            </div>
            <div className="header-stat">
              <span className="stat-label">Monthly Income</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>₹</span>
                <input
                  type="number"
                  value={salary || ''}
                  placeholder={currentSalary.toString()}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setSalary(val);
                    localStorage.setItem('spendsmart_salary', val);
                  }}
                  className="salary-input"
                />
              </div>
            </div>
            <div className="header-stat">
              <span className="stat-label">Savings Rate</span>
              <span className={`savings-badge ${savingsRate >= 15 ? 'savings-good' : savingsRate >= 0 ? 'savings-warn' : 'savings-danger'}`}>
                {savingsRate}%
              </span>
            </div>
            <button className="btn-reset" onClick={reset}>↺ New Upload</button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!transactions ? (
          <div className="landing">
            <div className="landing-hero">
              <h2>Know where your money goes.</h2>
              <p>Upload your bank statement CSV and get instant AI-powered insights, spending alerts, and a personalized savings plan.</p>
              <div className="feature-pills">
                <span>📊 Auto Categorization</span>
                <span>⚡ Smart Alerts</span>
                <span>🎯 Savings Simulator</span>
                <span>🤖 AI Coach</span>
              </div>
            </div>
            <UploadZone onData={setTransactions} />
          </div>
        ) : (
          <div className="dashboard">
            <InsightCards transactions={spendingTransactions} />
            <SpendingCharts transactions={spendingTransactions} />
            <div className="bottom-grid">
              <SavingsSimulator transactions={spendingTransactions} salary={currentSalary} />
              <AICoach transactions={spendingTransactions} salary={currentSalary} />
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>SpendSmart · Built for Fiserv Hackathon · All data processed locally in your browser</p>
      </footer>
    </div>
  );
}
