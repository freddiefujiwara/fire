# Asset Visualizer - Technical Specification (Very Detailed)

## 1. Project Overview

### 1.1 Background
Many people keep financial data in different places:

- Bank accounts
- Brokerage accounts
- Pension services
- Point/reward programs
- Credit card debt and mortgage debt
- Monthly income and expense records

Because these data sources are separate, it is hard to answer basic questions quickly:

- "How much is my net worth now?"
- "How much of my assets are risky?"
- "How much do I spend every month?"
- "When can I safely retire (FIRE)?"

This project solves that fragmentation problem by loading one portfolio payload from a Google Apps Script API and converting it into a unified in-memory model.

---

### 1.2 Goal
The app gives one integrated personal finance dashboard with three major capabilities:

1. **Balance sheet visualization** (assets, liabilities, net worth)
2. **Cash flow analytics** (filters, KPIs, monthly/category aggregation, 3-type expense classification)
3. **FIRE simulation** (deterministic and Monte Carlo sustainability analysis until age 100)

The app is designed for direct practical use, not just static reporting. It supports:

- Real API + auth flow
- Mock fallback when API is unavailable
- Copy-to-clipboard for analysis data and simulation outputs
- Privacy masking mode for sensitive amount values

---

### 1.3 Problems It Solves

- **Data inconsistency**: Input fields can include currency symbols, commas, or percent strings. Parsing/normalization layers standardize values.
- **Resilience**: If API fails, app automatically falls back to mock data.
- **Owner separation**: Holdings can be filtered by owner (self/spouse/daughter) through text-based owner detection rules.
- **Financial planning complexity**: FIRE module includes inflation, tax, pension timing, mortgage payoff, lifestyle reduction, and sequence-of-returns risk (Monte Carlo).

---

## 2. System Architecture

### 2.1 Runtime Stack

- **Vue 3** (Composition API)
- **Vite** (build/dev tool)
- **Pinia** (state management)
- **Vue Router** (page routing)
- **Vitest + Vue Test Utils** (unit tests)

---

### 2.2 High-Level Layer Design

1. **UI/View Layer (`src/views`, `src/components`)**
   - Presents interactive charts (SVG-based) and tables.
   - Kept logic-light: views mainly bind UI and delegate orchestration to feature composables.

2. **State Layer (`src/stores`)**
   - `portfolio` store fetches + normalizes portfolio data.
   - `ui` store manages privacy mode persistence.

3. **Domain Layer (`src/domain`)**
   - Pure logic modules for parsing, formatting, aggregation, owner detection, and simulation.
   - Business rules are intentionally concentrated here.

4. **Composable Layer (`src/composables`, `src/features/*`)**
   - Reusable orchestration (data loading, hash-restore behavior).
   - Feature-specific view models (e.g. `src/features/fireSimulator/useFireSimulatorViewModel.js`) isolate simulation behavior from `.vue` templates.
---

### 2.3 Route Map

- `/` -> redirect to `/balance-sheet`
- `/holdings` -> redirect to `/balance-sheet`
- `/balance-sheet` -> integrated asset/liability/holdings page
- `/cash-flow` -> transaction analytics page
- `/fire` -> FIRE simulation page

---

## 3. Data Contracts and Data Structures

## 3.1 External API Input (Raw)
The app expects JSON from a Google Apps Script endpoint. Main keys (raw format) include:

- `breakdown`: asset summary by category
- `breakdown-liability`: liability summary by category
- `total-liability`: total liabilities
- `details__portfolio_det_depo__t0`: cash-like holdings
- `details__portfolio_det_eq__t0`: stock holdings
- `details__portfolio_det_mf__t0`: fund holdings
- `details__portfolio_det_pns__t0`: pension holdings
- `details__portfolio_det_po__t0`: point holdings
- `details__liability_det__t0-liability`: detailed liabilities
- `mfcf`: cash flow rows

Special server-side auth error shape:

- `{ status: 401|403, error: "..." }`

---

### 3.2 Internal Normalized Model
After normalization, the store keeps one canonical structure:

```ts
interface Portfolio {
  totals: {
    assetsYen: number;
    liabilitiesYen: number;
    netWorthYen: number;
  };
  summary: {
    assetsByClass: Array<{ name: string; amountYen: number; percentage: number }>;
    liabilitiesByCategory: Array<{ category: string; amountYen: number; percentage: number }>;
  };
  holdings: {
    cashLike: any[];
    stocks: any[];
    funds: any[];
    pensions: any[];
    points: any[];
    liabilitiesDetail: any[];
  };
  cashFlow: Array<{
    date: string;
    amount: number;
    currency: string;
    name: string;
    category: string;
    isTransfer: boolean;
  }>;
}
```

---

### 3.3 Store State

`portfolio` store state:

- `data: Portfolio | null`
- `loading: boolean`
- `error: string`
- `source: "" | "live" | "mock"`
- `rawResponse: object | null`

`ui` store state:

- `privacyMode: boolean`

---

## 4. Detailed Functional Specification

## 4.1 App Shell + Authentication Gate

### Input

- Local storage values:
  - `asset-theme`
  - `asset-google-id-token`
  - `asset-privacy`
- Env variable:
  - `VITE_GOOGLE_CLIENT_ID`

### Behavior

1. On mount:
   - Reads theme and token from localStorage.
   - Loads Google Identity Services script (`https://accounts.google.com/gsi/client`).
   - Calls portfolio fetch if no current data and no current error.

2. Login gate visibility:
   - Shown when initial loading ended, token is missing, and live data is unavailable.

3. Google login button:
   - Renders only when script loaded + client id exists + gate visible.

4. Logout:
   - Removes token from localStorage.
   - Clears portfolio store state.
   - Triggers new fetch (which then may fall back to mock or show auth errors depending on API behavior).

### Exceptions / Edge Cases

- Missing client id -> login gate shows explicit configuration message.
- Google script load failure -> user-facing error shown.
- If auth error appears while token exists, app auto-logs out and retries cleanly.

---

## 4.2 Data Fetching (`portfolio` store)

### Input

- API endpoint constant
- Optional `id_token` query param from localStorage

### Output

- Live normalized data OR mock normalized data
- Error state for auth/CORS/network/HTTP

### Step-by-step Flow

1. Prevent duplicate fetch when `loading = true`.
2. Prevent repeated retries after terminal CORS-blocked state.
3. Build API URL. If id token exists, append `id_token` query param.
4. Fetch API.
5. If HTTP non-OK -> throw `HTTP <status>` error.
6. Parse JSON.
7. If payload contains auth status (401/403):
   - If error is `missing id token` but token exists: retry once.
   - If still missing token -> throw guided auth error message for GAS implementation.
   - Otherwise throw `AUTH <status>: <message>`.
8. On success:
   - Keep `rawResponse`
   - Normalize payload (`json.data ?? json`)
   - `source = "live"`

### Error Branches

1. **AUTH error**:
   - Keep `data = null`
   - `source = ""`
   - No mock fallback (explicit auth issue should be visible)

2. **CORS-style fetch error with token present**:
   - Keep `data = null`
   - `source = ""`
   - Set CORS guidance message
   - Block further auto-retries

3. **Other errors**:
   - Fallback to bundled `sampleApi.json`
   - Normalize mock
   - `source = "mock"`
   - Keep human-readable fallback message

---

## 4.3 Normalization Rules (`normalizePortfolio`)

### Main Rules

- Any missing list key becomes empty array.
- All amount-like fields are parsed with robust numeric parser.
- Percent strings like `"9.4%"` become `9.4`.
- Net worth = assets - liabilities.

### Pension special rule
If a pension row has no `評価損益` but has `現在価値` and `評価損益率`:

\[
profit = round( currentValue * rate / (100 + rate) )
\]

This is skipped when denominator is zero (`rate = -100`).

### Cash flow normalization
Each transaction row is converted to:

- safe string date (`""` if missing)
- numeric amount (0 if invalid)
- currency default `"JPY"`
- string name/category defaults
- boolean `isTransfer`

---

## 4.4 Balance Sheet Page

### Functions

1. Owner filter (`all`, `me`, `wife`, `daughter`) via query param.
2. Category cards with per-category totals, counts, and privacy blurring.
3. Balance sheet geometry (asset panel vs liability/net-worth split).
4. Risk Asset summary (Stocks, Investment Trusts, Pensions):
   - Total valuation amount.
   - Total daily change (calculates from Stocks and Investment Trusts, excluding Pensions).
   - Total profit and profit rate.
5. Integrated risk asset Treemap 「総保有銘柄（評価額）」 showing combined holdings.
6. Individual category Treemaps for Stocks, Investment Trusts (aggregated by name), and Pensions (aggregated by name).
7. Detailed holding tables with sortable risk/total asset ratios and CSS ellipsis for long names.
8. Copy mapped raw asset JSON (excluding cash flow key) for external analysis.

### Input/Output

- Input: normalized `data.holdings` + query param `owner`
- Output: computed view data (cards, charts, tables, totals)

---

## 4.5 Cash Flow Page

### Filters and Interactivity

- Month (`YYYY-MM`)
- Large/Small category (synchronized with Pie Chart legend clicks for drill-down).
- Type filter: **Fixed** (固定費), **Variable** (変動費), **Exclude** (除外).
- Text search (name + category).
- Include/exclude transfers (transfers are always categorized as 'Exclude' and omitted from lifestyle cost averages).

### Metrics and Aggregations

- KPI: income, expense, net, transfers.
- Monthly Trends: Dual-axis chart showing income/expense bars (left) and deviation rates (right) for Total/Fixed/Variable costs.
- Stacked Expense Bars: Visualizes Fixed (#38bdf8) at the bottom, Variable (#f59e0b) in the middle, and Exclude (#4b5563) at the top.
- Expense category pie (interactive legend, 5-month average option).
- 5-month summary including breakdown of fixed/variable averages synchronized with FIRE simulator.

### Copy Features

- Per-month `mfcf` JSON snippets.
- Past-5-month summary JSON (for FIRE simulation parameters).

---

## 4.6 FIRE Simulator Page

### 4.6.1 Inputs

User-adjustable parameters include:

- `monthlyInvestment`, `annualReturnRate`.
- `currentAge`, `withdrawalRate`.
- `includeInflation` / `inflationRate`.
- `includeTax` / `taxRate` (Defaults to **enabled**).
- `includePension` (Integrated household model with configurable birth dates and pension amounts).
- `mortgageMonthlyPayment`, `mortgagePayoffDate` (Payments stop following the specified payoff month).
- `postFireExtraExpense` (Covers National Health Insurance, Pension, Property Tax), `postFireFirstYearExtraExpense` (Social insurance spike).
- `retirementLumpSumAtFire` (Retirement bonus).
- **Monte Carlo Settings**: Trials count, annual volatility.

### 4.6.2 Auto-derived values

- Initial assets: Total Financial Assets (`totalFinancialAssetsYen`), risk assets, and cash assets from owner-scoped portfolio.
- Past-5-month summary for expense/income/bonus defaults from Cash Flow history.
- Mortgage payment estimate from category prefix `住宅/ローン返済`.

### 4.6.3 Outputs

- Earliest FIRE month/age that survives to age 100.
- 'Required Assets for FIRE' (あといくら必要か calculation).
- Interactive Chart: Asset growth paths, required assets line, and life event annotations (e.g., "Dependent's Independence").
- **Monte Carlo Results**: Success rate and P10/P50/P90 percentile paths visualizing sequence-of-returns risk.
- Annual simulation summary table.
- Algorithm explanation with detailed breakdown of excluded assets and lifestyle reduction rules.

---

## 5. Algorithm Details

## 5.1 Parsing Algorithms

### `toNumber`
Robustly extracts numeric values from strings containing currency symbols, commas, and Japanese characters.
Time: **O(n)**; Space: **O(n)**.

---

## 5.2 Balance Layout Algorithm (`balanceSheetLayout`)
Calculates proportional widths/heights for the visual balance sheet, clamping ratios to avoid invisible blocks.

---

## 5.3 Stock Treemap Algorithm (`layoutTreemap`)
Recursive binary split algorithm.
- Aggregation: Investment Trusts and Pensions are aggregated by name across different institutions before layout.
- Logic: Splits along the longer dimension to maintain aspect ratio.
Time: **O(n log n)**; Space: **O(n)**.

---

## 5.4 Owner Detection Algorithm
Inferred from string suffix patterns (e.g., `@chipop` for wife, `@aojiru.pudding` for daughter).
Complexity: **O(k)** per row.

---

## 5.5 Cash Flow Aggregation Algorithms

### `getExpenseType`
Classifies expenses into 3 types:
1. **Exclude**: `isTransfer` OR specific keywords (Special Expenses, Cash, Card).
2. **Fixed**: Mortgage, Utilities, Insurance, Education, Health, certain Food categories.
3. **Variable**: All other negative transactions.

### `getRecentAverages`
Calculates 5-month historical averages (excluding current month) for all expense types to ensure consistency across pages.

---

## 5.6 FIRE Simulation Core Algorithm

### 5.6.1 Monthly Simulation Logic
Calculates monthly transitions considering:
- **Taxes**: Tracks cost basis of risk assets; applies capital gains tax only to the profit portion of withdrawals.
- **Investment Limits**: Monthly investment is capped by available cash to prevent negative cash positions.
- **Retirement Events**: Injects a lump sum at FIRE and applies a social insurance "spike" in the first post-retirement year.

### 5.6.2 Lifestyle Reduction
Automatically reduces specific category expenses after the dependent's independence (dynamically calculated from birth date):
- **x2/3 Multiplier**: Food, Communication, Clothing/Beauty, Daily Goods.
- **Zero**: Education.

### 5.6.3 Monte Carlo Engine (`runMonteCarloSimulation`)
Evaluates sequence-of-returns risk using stochastic trials:
- **Randomness**: Mulberry32 seeded PRNG for reproducibility.
- **Distribution**: Lognormal distribution via Box-Muller transform.
- **Metrics**: Calculates success rate and percentile paths (P10, P50, P90).

### 5.6.4 Required Assets backward loop
Calculates target assets at each month from end-of-life backward, accounting for inflation-adjusted withdrawal needs and tax gross-up.

---

## 6. Technology Choices and Rationale

- **Vue 3 + Pinia**: Reactive state management and component-based UI.
- **SVG Charts**: Custom implementation for performant, high-control financial visualizations (Dual-axis, Treemaps, Simulation paths).
- **Domain-First Logic**: Core algorithms (Simulation, Aggregation) isolated from UI for 100% test coverage.

---

## 7. Setup and Development

### 7.1 Requirements
- Node.js (LTS)
- npm

### 7.2 Commands
```bash
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:5173/asset/)
npm run test       # Run unit tests (Vitest)
npm run test:coverage # Run unit tests with coverage report
npm run build      # Build for production (output to dist/)
npm run preview    # Preview production build
```

---

## 8. Deployment and Configuration

### 8.1 Environment Variables
Create `.env.local`:
```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 8.2 Browser Local Storage Keys
- `asset-theme`: `dark` | `light`
- `asset-privacy`: `on` | `off`
- `asset-google-id-token`: JWT token for GAS API authentication

---

## 9. Module Reference

- `src/domain/parse.js`: Robust number/percent parsing.
- `src/domain/format.js`: Currency and sign formatting.
- `src/domain/normalize.js`: Canonical portfolio normalization.
- `src/domain/holdings.js`: Holdings aggregation and treemap tile generation.
- `src/domain/cashFlow.js`: 3-type classification and aggregation helpers.
- `src/domain/fire.js`: FIRE domain facade that re-exports FIRE modules.
- `src/domain/fire/engine.js`: FIRE simulation engine, cashflow projections, and Monte Carlo core.
- `src/domain/fire/pension.js`: Pension constants and pension amount calculations.
- `src/domain/fire/portfolio.js`: Portfolio/owner-specific FIRE asset aggregation helpers.
- `src/features/fireSimulator/useFireSimulatorViewModel.js`: FIRE page orchestration (state, computed values, copy payload composition).
- `src/features/fireSimulator/formatters.js`: FIRE display/serialization helpers and export payload builders.
- `src/features/balanceSheet/useBalanceSheetViewModel.js`: Balance Sheet page orchestration and derived portfolio metrics.
- `src/features/cashFlow/useCashFlowBarChartViewModel.js`: Cash flow bar chart rendering/view-state calculations.
- `src/features/cashFlow/useCashFlowViewModel.js`: Cash Flow page filters, KPI derivations, and copy/export helpers.
- `src/features/holdings/useHoldingTableViewModel.js`: Holding table sorting and cell-format view logic.
- `src/features/app/useAppShellViewModel.js`: App shell login/theme/privacy orchestration.
- `src/lib/lzString.js`: URI-safe compressed string encoder used for external chart/data links.
- `src/stores/portfolio.js`: Data fetch/auth/mock state machine.
- `src/stores/ui.js`: Privacy mode and theme persistence.

---

## 10. Known Constraints
- Owner detection depends on naming consistency in source data.
- Monte Carlo assumes lognormal returns without autocorrelation.
- App expects Japanese category naming conventions for specific logic (pension/mortgage).
