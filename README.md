# FIRE Simulator - Technical Specification
URL: https://freddiefujiwara.com/fire

## 1. Project Overview

### 1.1 Background
The FIRE (Financial Independence, Retire Early) journey requires precise long-term financial projections. Traditional spreadsheets often struggle with:
- Monthly compounding interest and inflation adjustments.
- Dynamic household changes (marriage, children, independence).
- Complex life events like mortgage payoff or pension start dates.
- Sequence-of-returns risk (the "order" of market returns).

This project provides a specialized, high-performance simulation tool to answer the core question: **"When can I safely retire based on my current assets and future lifestyle?"**

---

### 1.2 Goal
The application provides a single, integrated FIRE simulation dashboard with the following capabilities:
1. **Household-based Modeling**: Supports Single, Couple, and Family configurations with dynamic logic for spouse and dependents.
2. **Monthly Cash Flow Engine**: Calculates asset growth, income, expenses, and withdrawals on a monthly basis until a configurable simulation end age (default: 100).
3. **Sequence Risk Evaluation**: Uses Monte Carlo simulations (1,000+ trials) to assess the probability of success under market volatility.
4. **Shareable Scenarios**: Encodes the entire simulation state into a URL for easy sharing and saving without a backend database.

---

### 1.3 Problems It Solves
- **Complexity of Life Stages**: Automatically handles lifestyle cost reductions after children become independent and shifts in expense patterns post-retirement.
- **Tax and Inflation Realism**: Accounts for capital gains tax (only on profit portions) and compounding inflation on base expenses.
- **Sequence Risk**: Moves beyond "fixed return" assumptions to show how a market crash early in retirement affects long-term sustainability.
- **Privacy**: Includes a "Privacy Masking" mode to hide sensitive financial amounts during presentation or sharing.

---

## 2. System Architecture

### 2.1 Runtime Stack
- **Vue 3** (Composition API): Reactive UI and state management.
- **Vite**: Modern frontend build tool.
- **Pinia**: Global state for UI settings (Privacy, Theme).
- **Vue Router**: History-based routing with state-recovery from URLs.
- **Vitest**: High-performance unit testing.

---

### 2.2 High-Level Layer Design
1. **UI Layer (`src/views`, `src/components`)**: Logic-light components focused on rendering SVG charts and interactive forms.
2. **ViewModel Layer (`src/features/fireSimulator`)**: Orchestrates simulation state, handles user input, and triggers calculations.
3. **Domain Layer (`src/domain/fire`)**: Pure logic for the simulation engine, pension calculations, and Monte Carlo trials. Isolated for 100% testability.
4. **URL State Layer (`src/domain/fire/url.js`)**: Handles compression/decompression of simulation parameters using `lz-string`.

---

### 2.3 Route Map
- `/fire/` -> The main simulator page.
- `/:p?` -> Captures the encoded simulation state from the path parameter.

---

## 3. Detailed Functional Specification

### 3.1 Simulation Engine (`src/domain/fire/engine.js`)
The engine performs monthly calculations prioritizing cash withdrawals before selling risk assets.
- **Investment Limits**: Monthly investment is automatically capped by available cash surplus to maintain liquidity.
- **Tax Logic**: Tracks cost basis for risk assets. Capital gains tax is applied only to the gain portion during withdrawals.
- **Required Assets**: Uses a backward-induction algorithm to calculate the minimum assets needed at the point of retirement to survive until the configured simulation end age.

### 3.2 Household Logic
- **Household Types**: Single, Couple, Family.
- **Lifestyle Reduction**: Automatically applies a reduction factor to non-mortgage expenses when children reach the "Independence Age" (default 24).
- **Pension Integration**: Models National and Employees' Pension (Kosei Nenkin) considering retirement age impact on future accrual and early/late start reduction factors.

### 3.3 Monte Carlo Simulation
- **Optimized Performance**: Trial complexity is reduced to **O(M)** (where M is months) by bypassing non-essential backward calculations during stochastic runs.
- **Statistical Model**: Uses a lognormal return model with monthly parameters derived from annual mean and volatility.
- **Output**: Visualizes P10 (Conservative), P50 (Median), and P90 (Optimistic) paths alongside a "Success Rate" percentage.

### 3.4 Data Persistence (Shareable URLs)
- Uses **lz-string** to compress simulation parameters into a compact, URL-safe string.
- The application automatically synchronizes the URL path as users adjust sliders or input fields.

---

## 4. Technology Choices and Rationale
- **SVG over Canvas**: SVG is used for charts to provide high-quality rendering, easy styling via CSS, and better accessibility for interactive elements like annotations.
- **Domain/ViewModel Separation**: Ensures that the complex simulation logic is independent of the Vue framework, facilitating easier testing and future migrations.
- **No Backend Approach**: By using URL-encoded state and GitHub Pages for hosting, the tool is zero-maintenance and highly portable.

---

## 5. Setup and Development

### 5.1 Requirements
- Node.js (v20+)
- npm

### 5.2 Commands
```bash
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:5173/fire/)
npm test           # Run unit tests (Vitest)
npm run build      # Build for production (output to dist/)
npm run preview    # Preview production build
```

---

## 6. Module Reference
- `src/domain/fire/engine.js`: Core simulation logic and Monte Carlo trials.
- `src/domain/fire/pension.js`: Pension amount and reduction factor logic.
- `src/domain/fire/url.js`: URL-safe compression/decompression.
- `src/features/fireSimulator/useFireSimulatorViewModel.js`: Page orchestration and reactive state.
- `src/components/FireSimulationChart.test.js`: SVG chart rendering logic.
- `src/main.js`: App entry and router configuration.

---

## 7. Known Constraints
- The simulation assumes a fixed inflation rate throughout the period.
- Monte Carlo trials assume independent monthly returns (no autocorrelation).
- Pension calculations are based on Japanese system conventions as of 2024.
