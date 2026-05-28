import { useState } from 'react';
import UploadZone from './components/UploadZone';
import SpendingCharts from './components/SpendingCharts';
import InsightCards from './components/InsightCards';
import SavingsSimulator from './components/SavingsSimulator';
import AICoach from './components/AICoach';
import './App.css';

export default function App() {
  const [transactions, setTransactions] = useState(null);

  const reset = () => setTransactions(null);
  const total = transactions ? Math.round(transactions.reduce((s, t) => s + t.amount, 0)) : 0;

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
            <InsightCards transactions={transactions} />
            <SpendingCharts transactions={transactions} />
            <div className="bottom-grid">
              <SavingsSimulator transactions={transactions} />
              <AICoach transactions={transactions} />
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
