# PaisaLens

### Your money, understood.

PaisaLens is an AI-powered personal finance and smart budgeting platform that helps users understand their spending by analysing bank and UPI SMS messages.

It converts unstructured transaction messages into organised financial insights, calculates actual spending after eligible refunds, and helps users explore smarter savings decisions.

**Live Demo:** https://paisa-lens-seven.vercel.app  
**GitHub Repository:** https://github.com/Sanj-vs/PaisaLens

---

## The Problem

People receive numerous bank and UPI transaction messages, but understanding their actual spending is not always easy.

- Transaction messages are unstructured and difficult to track.
- Failed payments and refunds can make spending totals misleading.
- Spending is spread across multiple merchants and categories.
- People often struggle to identify where they can save money.

## Our Solution

PaisaLens transforms transaction SMS messages into meaningful financial information.

Users can import or paste transaction messages and receive a structured overview of their spending, refunds, income, categories, and potential savings.

## Key Features

### 1. SMS Import and Processing

- Import transaction messages using text, TXT, or CSV.
- Parse common Indian bank and UPI SMS formats.
- Extract transaction amounts, merchants, dates, and statuses.
- Use regex-based parsing with Gemini-assisted fallback for supported complex messages.

### 2. Accurate Net-Spend Calculation

- Calculate gross spending from successful debit transactions.
- Exclude failed transactions.
- Match eligible refunds to previous payments from the same merchant within a 15-day window.
- Avoid deducting unmatched or ambiguous refunds.
- Keep salary and other income separate from spending.

### 3. Smart Dashboard

- View gross spending and actual net spending.
- Track refunds and income.
- Explore category-wise spending.
- Compare spending against a monthly budget.
- View AI-generated financial insights.

### 4. Transaction Management

- Search and filter transactions.
- Sort transaction records.
- View individual transaction details.
- Understand how each transaction affects net spending.

### 5. AI-Powered Insights

- Generate understandable explanations of spending patterns.
- Highlight important spending observations.
- Use deterministic Python calculations as the source of financial numbers.

### 6. Savings Simulator

- Experiment with reducing spending.
- See estimated monthly savings.
- Explore projected annual savings.
- Understand how small changes can affect a budget.

### 7. User Authentication

- Sign up and log in using Supabase authentication.
- Access the dashboard after authentication.

---

## How It Works

PaisaLens follows a simple processing pipeline:

1. **Import:** The user provides bank or UPI SMS messages.
2. **Parse:** The parser extracts transaction information.
3. **Categorise:** Transactions are assigned spending categories.
4. **Calculate:** Python processes payments, refunds, income, and net spending.
5. **Analyse:** Gemini generates explanations using verified calculation results.
6. **Visualise:** The dashboard presents financial summaries and savings simulations.

### Core Principle

**AI explains the numbers. Python calculates the numbers.**

Financial calculations are handled by deterministic Python logic rather than relying on an AI model to perform arithmetic.

---

## Technology Stack

| Component           | Technology        |
| ------------------- | ----------------- |
| Frontend            | React, Vite       |
| Backend             | Python, FastAPI   |
| Data Processing     | Pandas            |
| AI Integration      | Google Gemini API |
| Authentication      | Supabase          |
| Testing             | Pytest            |
| Frontend Deployment | Vercel            |
| Backend Deployment  | Render            |
| Version Control     | Git, GitHub       |

---

## System Architecture

```text
        USER
         |
         v
   React + Vite
    (Frontend)
         |
         v
    FastAPI Backend
         |
         v
   SMS Parser
         |
         v
   Categorisation
         |
         v
   Python Net-Spend Engine
         |
         +------------------+
         |                  |
         v                  v
   Verified Financial   Gemini AI
      Calculations      Explanations
         |                  |
         +--------+---------+
                  |
                  v
          PaisaLens Dashboard
```

Supabase handles user authentication separately.

---

## Project Structure

```text
ai-finance/
|
|-- backend/
|   |-- main.py
|
|-- frontend/
|   |-- data/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- AuthPage.jsx
|   |   |-- parser.py
|   |   |-- net_spend.py
|   |   |-- categorizer.py
|   |   |-- ai_client.py
|   |   |-- insights.py
|   |
|   |-- package.json
|
|-- tests/
|
|-- requirements.txt
|-- .gitignore
|-- README.md
```

---

## Running Locally

### Prerequisites

- Python 3.11
- Node.js and npm
- Google Gemini API key
- Supabase project credentials

### 1. Clone the Repository

```bash
git clone https://github.com/Sanj-vs/PaisaLens.git
cd PaisaLens
```

### 2. Set Up Python Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure Backend Environment

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Never commit API keys or secret credentials.

### 4. Start the Backend

From the project root:

```powershell
uvicorn main:app --reload --app-dir backend
```

Backend runs at:

`http://127.0.0.1:8000`

### 5. Configure the Frontend

Open another terminal:

```powershell
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_API_URL=http://127.0.0.1:8000
```

### 6. Start the Frontend

```powershell
npm run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173`

---

## Testing

Run the Python test suite from the project root:

```powershell
python -m pytest -v
```

Build the frontend:

```powershell
cd frontend
npm run build
```

---

## AI Usage and Financial Accuracy

PaisaLens uses Google Gemini to assist with complex transaction-message interpretation and to generate understandable financial insights.

Financial calculations, including gross spending, refund matching, failed-payment exclusion, and net spending, are handled by Python.

The system uses conservative refund matching. Unmatched or ambiguous refunds are not silently deducted from spending.

The application is a hackathon prototype and should not be treated as a substitute for official bank statements or professional financial advice.

## Current Limitations

- SMS messages are supplied by the user; the application does not automatically read messages from a phone.
- Transaction processing is demonstrated using imported or synthetic data.
- Backend authentication and per-user transaction storage are not yet implemented. The current authentication flow should be considered a demo feature, not a production security boundary.
- Refund matching depends on the information available in transaction messages.
- AI-generated explanations should be reviewed by users.

## Future Enhancements

We plan to evolve PaisaLens into a more personalised and intelligent financial management platform.

### 1. Personalised Budgeting

- Allow users to create custom monthly budgets.
- Provide category-wise budget allocation.
- Adapt budget suggestions based on spending patterns.

### 2. Advanced Financial Insights

- Compare spending across multiple months.
- Identify recurring expenses and spending trends.
- Generate personalised AI-powered saving recommendations.

### 3. Smart Notifications

- Alert users when they approach their monthly budget.
- Identify unusual spending patterns.
- Provide reminders for recurring expenses.

### 4. Improved Transaction Intelligence

- Improve refund matching for complex and partial refunds.
- Support more Indian bank and UPI SMS formats.
- Expand regional language and Hinglish support.

### 5. Security and Data Management

- Implement secure backend authentication using Supabase JWT verification.
- Introduce persistent per-user transaction storage.
- Apply database access controls to protect financial information.

### 6. Advanced Financial Reporting

- Generate downloadable monthly financial reports.
- Provide detailed spending analytics.
- Track savings progress over time.

Our long-term vision is to make PaisaLens a personal financial companion that helps users understand, manage, and improve their financial decisions.

---

## Demo

**Try PaisaLens:** https://paisa-lens-seven.vercel.app

**Explore the source code:** https://github.com/Sanj-vs/PaisaLens

---

## Disclaimer

PaisaLens is developed as a hackathon prototype for smart budgeting and financial awareness. It uses sample and user-provided transaction data. It does not connect directly to bank accounts or initiate financial transactions.

---

**PaisaLens — Your money, understood.**
