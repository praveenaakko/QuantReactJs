# QuantCure Frontend

Frontend application for QuantCure molecular workflows, built with React + TypeScript + Vite.

## Modules

- Docking Runs
- ML Model Training (ML Builder)
- ML Prediction Runs (ML Predictor)
- Compound Generation
- Synthesis Route
- Dashboard + User Management (admin)

## Recent Improvements

- Date handling standardized across listing pages:
  - consistent sorting by timestamp
  - IST (`Asia/Kolkata`) 12-hour display formatting
- API mapping hardened for both `camelCase` and `snake_case` fields
- Global loading state improved to handle concurrent requests safely
- Docking delete flow migrated from native `window.confirm` to shared confirmation modal
- Confirmation modal redesigned and refined for better UX
- CSV utilities improved:
  - sample CSV downloads added in multiple workflows
  - molecular library table export added in Compound Generation details
- Added lightweight test setup and core tests

## Prerequisites

- Node.js 18+
- npm
- Backend API running (default expected at `http://localhost:8000`)

## Environment

Create `.env.local` in project root:

```env
BACKEND_URL=http://localhost:8000
GEMINI_API_KEY=your_key_if_needed
```

## Run Locally

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run lint` - TypeScript check
- `npm run typecheck` - TypeScript check
- `npm run test` - run test suite

## Tests

Current tests are located in:

- `tests/storeReducer.test.ts`
- `tests/mlPredictorMappers.test.ts`

Run:

```bash
npm run test
```

## Project Structure

- `components/` UI sections and modals
- `store/` global state and reducer
- `utils/` shared mappers and date helpers
- `config/` API client
- `api/` backend scaffolding used in this repository
