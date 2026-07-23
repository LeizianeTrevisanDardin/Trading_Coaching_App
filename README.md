# 📈 Trade AI Coaching

A modern trading journal and planning platform built with **Next.js**, **TypeScript**, and **Supabase**. Designed to help futures traders improve consistency through structured planning, risk management, trade journaling, and AI-assisted trade analysis.

---

## Why I Built This Project

As I began learning futures trading, I realized that many existing trading journals were either expensive, overly complex, or lacked the features I needed to improve my discipline.

I decided to build my own platform that combines trade planning, journaling, analytics, and AI-powered coaching into a single application.

This project also serves as a portfolio piece demonstrating my skills in full-stack web development using Next.js, TypeScript, Supabase, PostgreSQL, and modern UI design.

##  Features

###  Authentication
- Secure user authentication with Supabase Auth
- Protected dashboard
- User-specific data

---

### 📊 Trade Planner

Plan every trade before entering the market.

Features:

- Select contract
  - Stocks
  - MES
  - ES
  - MNQ
  - NQ
- Long / Short direction
- Entry Price
- Stop Loss
- Risk/Reward selection
- Position size calculation
- Risk calculation
- Profit target calculation

The planner automatically calculates:

- Risk in dollars
- Risk in points
- Risk in ticks
- Suggested quantity
- Take Profit price
- Expected reward

---

###  Trading Journal

Keep track of every trade.

Each journal entry stores:

- Contract
- Direction
- Entry
- Stop Loss
- Take Profit
- Quantity
- Trade Result
- Notes
- AI Analysis
- Screenshot

This helps traders review their performance over time.

---

### AI Trade Analysis

Upload a chart screenshot and receive AI feedback.

The AI evaluates:

- Market structure
- Trend
- Breakout quality
- Retest quality
- Risk/Reward
- Entry quality
- Stop placement
- Trade confidence

It also provides:

- Score (0–100)
- Positives
- Warnings
- Lesson learned
- Trade management suggestions

---

###  Analytics

Track your trading performance with statistics.

Examples:

- Win rate
- Average R:R
- Total trades
- Best setups
- Common mistakes
- Trading history

---

###  Playbook

Create your personal trading rules.

Examples:

- ORB Strategy
- Trend Pullback
- Reversal
- Breakout
- Daily Checklist
- Risk Rules

---

### User Dashboard

Each trader has their own private workspace with:

- Planner
- Journal
- Analytics
- AI Analysis
- Playbook

---

##  Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Storage
- OpenAI API (AI analysis)

---

##  Project Structure

```
src/
│
├── app/
│   ├── dashboard/
│   ├── trader-planner/
│   ├── journal/
│   ├── analytics/
│   ├── playbook/
│   ├── settings/
│   └── login/
│
├── components/
│
├── lib/
│
├── types/
│
└── utils/
```

---

##  Project Goals

The objective of this application is to help traders become more disciplined by following a complete trading workflow:

1. Plan the trade
2. Calculate risk
3. Execute with discipline
4. Journal the trade
5. Review performance
6. Learn from AI feedback
7. Improve consistency

---

##  Future Improvements

- Calendar view
- Trading streak tracker
- Performance charts
- Strategy tagging
- Economic calendar
- Broker integration
- TradingView integration
- AI coaching chat
- Daily trading goals
- Weekly reports
- Monthly reports

---

## 📷 Screenshots

Coming soon.

---

##  Author

**Leiziane Trevisan Dardin**

Software Developer

Built with ❤️ using Next.js and Supabase.
