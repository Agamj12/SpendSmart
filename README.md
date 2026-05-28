# 💎 SpendSmart — AI Financial Wellness Engine

> Built for the Fiserv Hackathon | Team of 3

---

## 🚀 Quick Setup (< 2 minutes)

```bash
cd spendsmart
npm install
npm run dev
```

Open http://localhost:5173

---

## 📁 Project Structure

```
src/
  components/
    UploadZone.jsx        # CSV drag-drop upload
    SpendingCharts.jsx    # Pie + Bar charts (Recharts)
    InsightCards.jsx      # Overspend alerts, spike detection
    SavingsSimulator.jsx  # Interactive slider → savings projection
    AICoach.jsx           # Claude AI integration panel
  utils/
    insights.js           # Categorization + analytics engine
  App.jsx                 # Main layout + routing
  App.css                 # Full premium dark theme
public/
  sample_transactions.csv # Demo data for presentation
```

---

## 👥 Team Split

| Member | Files to Own |
|--------|-------------|
| **A (Tech Lead)** | `AICoach.jsx`, `insights.js`, `App.jsx` |
| **B (Frontend)** | `SpendingCharts.jsx`, `App.css` polish |
| **C (Data/UX)** | `SavingsSimulator.jsx`, `UploadZone.jsx`, `sample_transactions.csv` |

---

## 🎯 Demo Flow (Practice This!)

1. Land on homepage → show feature pills
2. Click **"Load Sample Data"** → instant dashboard
3. Point at **Insight Cards** → "Food up 42%, here's the alert"
4. Show **Charts** → "Pie + monthly trend, auto-categorized"
5. Drag **Savings Simulator** sliders → "₹4,500/month saved"
6. Click **AI Coach** quick prompt → live Claude response
7. "All data stays in the browser — zero backend, fully secure"

---

## 🔑 AI Coach Note

The AI Coach calls the Claude API directly from the browser.
For the hackathon demo, the API key is handled by the platform.
If it doesn't work, use the **quick-prompt buttons** which are pre-seeded.

---

## 📊 Scoring Alignment

| Criteria | Our Feature |
|----------|------------|
| Insight quality (40%) | InsightCards + AICoach |
| Visualization (30%) | Pie + Bar + Monthly trend |
| UX/Polish (20%) | Dark premium theme, animations |
| Business value (10%) | Savings simulator, SIP callout |

---

## 🧠 Key Talking Points

- "This is not an expense tracker — it's a **financial wellness engine**"
- "Auto-categorizes 20+ Indian merchants — Zomato, Uber, Swiggy, etc."
- "AI coach gives personalized advice on YOUR data, not generic tips"
- "Privacy-first: all computation happens locally in the browser"
- "Built for the Indian consumer — ₹, Indian merchants, Indian patterns"
