# ExpenseIQ — Technical Specification

**Status:** Draft
**Companion to:** `prd.md`
**Last updated:** 2026-07-17

## 1. Architecture Overview

Single repo, two runtime pieces:

- **Frontend** — React 19 + TypeScript, built with Vite, styled with
  Tailwind CSS v4. Lives in `src/`.
- **Backend** — Express 5 server (`server/index.ts`) that is the only piece
  that talks to Gemini. Holds no state; every request is stateless.

```
Browser (React SPA)
   │  fetch('/api/...')
   ▼
Express server (server/index.ts)
   │  @google/genai (Vertex AI backend, ADC auth)
   ▼
Gemini (gemini-2.5-flash default, model-selectable)
```

**Dev mode:** `npm run dev` runs `tsx watch` (server, port 3001) and Vite
(port 5173) concurrently; Vite proxies `/api/*` to `localhost:3001`
(`vite.config.ts`).

**Prod mode:** `npm run build` compiles the SPA into `dist/`; the Express
server serves `dist/` as static files and falls back to `index.html` for
client-side routing. Packaged via `Dockerfile` (multi-stage `node:22-slim`
build), listens on `PORT` (Cloud Run default 8080).

**Auth to Google Cloud:** Application Default Credentials only — no API
keys in the frontend. The server requires `GOOGLE_CLOUD_PROJECT`; it exits
on startup if unset. `GOOGLE_CLOUD_LOCATION` defaults to `us-central1`.

## 2. Data Model

All types in `src/types/index.ts`.

```ts
type SpendingCategory =
  | 'Meals & Dining' | 'Hotel & Lodging' | 'Rideshare & Taxi' | 'Airfare'
  | 'Office Supplies' | 'Entertainment' | 'Conference & Training'
  | 'Parking & Tolls' | 'Other';

interface Transaction {
  id: string;
  vendor: string;
  date: string;                 // YYYY-MM-DD
  amount: number;
  category: SpendingCategory | null;
  description?: string;
  attendees?: number;           // used for Meals & Dining per-person limit math
  source: 'bank' | 'receipt';
  receiptImage?: string;        // data: URL, image receipts only
  location?: string;
  policyStatus?: PolicyCheckResult;
}

interface PolicyCheckResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

interface PolicyRule {
  category: SpendingCategory;
  maxAmount: number;
  maxAmountLabel: string;
  notes: string;
  requiresReceipt: boolean;
  requiresPreApproval: boolean;
  preApprovalThreshold?: number;
}

interface CompanyPolicy {
  name: string;
  effectiveDate: string;
  rules: PolicyRule[];
  generalRules: string[];
}
```

**Source of truth / seed data** (all static, in-repo, no DB):
- `src/data/mockTransactions.ts` — 10 seed transactions; 1 intentional policy
  violation (TXN-007 Nobu $245 meal, 3 attendees). TXN-009 (InterContinental
  $395/night) is compliant under the $450/night hotel limit.
- `src/data/companyPolicy.ts` — the 9-category rule set + general rules.
- `src/data/reportGuidelines.ts` — report section list and formatting rules,
  rendered verbatim in the report footer; not enforced programmatically.

**Runtime state** lives in `App.tsx` (`useState<Transaction[]>`, seeded from
`mockTransactions`) and is passed down as props. No persistence layer — a
reload resets to the seed data.

## 3. API Contract

All endpoints on the Express server, JSON in/out unless noted. No auth on
the API itself (relies on network/deployment boundary).

### `POST /api/categorize`

Request:
```json
{ "vendor": "string", "amount": 0, "description": "string?", "model": "string?" }
```
Response: `{ "category": SpendingCategory }` — server prompts Gemini for
exactly one category name from the fixed list and falls back to `"Other"`
if the response doesn't match.

### `POST /api/process-receipt`

Request:
```json
{ "imageBase64": "string", "mimeType": "string", "model": "string?" }
```
`mimeType` one of `image/*`, `application/pdf`, `text/html`. HTML is decoded
to plain text and sent as a text prompt; images/PDF are sent as inline
binary data to Gemini vision.

Response:
```json
{
  "vendor": "string", "date": "YYYY-MM-DD", "amount": 0,
  "location": "string", "category": SpendingCategory,
  "lineItems": ["string"], "confidence": "high" | "medium" | "low"
}
```
Server clamps `category` to the known enum (defaults `"Other"`) and expects
Gemini to return a single JSON object (fenced code blocks are stripped
before parsing).

### `POST /api/send-report`

Request:
```json
{
  "reportId": "string", "employeeName": "string", "managerEmail": "string",
  "period": "string", "total": 0, "violations": 0, "transactionCount": 0
}
```
Response: `{ "success": true, "recipient": "dev@chenkeamonwang.altostrat.com" }`.
Demo mode only — logs a formatted summary to the server console; does not
send real email. (Enabling real send requires a Workspace admin to grant
the `gmail.send` scope; not implemented in code.)

### `GET /api/health`

Response: `{ "project": string, "location": string, "model": "gemini-2.5-flash" }`.
Used by the frontend on load to set the default selected model and to
detect whether the backend is reachable (failure sets a persistent error
banner).

## 4. Component Map

```
App.tsx                        — tab state, transaction state, health check
├── Header.tsx                 — logo, model selector (MODELS constant)
├── TransactionTable.tsx       — table, categorize, check policy, receipt upload
├── PolicyPanel.tsx            — read-only policy rule display
└── ExpenseReport.tsx          — report sections, print, notify manager
LanguageContext.tsx            — language state + translation lookup (React context)
LanguageToggle.tsx             — EN/中文 toggle button, used by all 3 tab views
i18n/translations.ts           — `en` / `zh` string tables + translateCategory()
services/geminiService.ts      — frontend fetch wrappers for /api/categorize,
                                  /api/process-receipt
services/policyChecker.ts      — pure functions: checkPolicy(), checkAllTransactions()
```

**Key client-side logic to preserve on any refactor:**
- `findMatchingTransaction` (`TransactionTable.tsx`) — receipt-to-transaction
  matching: reject if amount differs >5% or date differs >3 days; otherwise
  score by vendor substring match + amount closeness + date closeness, take
  the highest score.
- `checkPolicy` (`policyChecker.ts`) — pure function, one transaction in, one
  `PolicyCheckResult` out; category-specific rules (meals, airfare) are
  special-cased in addition to the generic max-amount/receipt/pre-approval
  checks driven by `PolicyRule`.

## 5. Localization

- `Language = 'en' | 'zh'`; `LanguageProvider` holds current language in
  React state (default `'en'`, no persistence across reload) and exposes
  `{ language, toggleLanguage, t }` via `useLanguage()`.
- `translations.ts` exports `{ en, zh }`; `Translation = typeof en` is the
  shape contract — `zh` must structurally match `en` or a TS error surfaces
  at the `translations` object literal.
- `translateCategory(category, t)` maps a `SpendingCategory` to its
  localized label; used everywhere a category is rendered (table, chart,
  policy panel, report).
- Known gap: hard-coded values not routed through `t` — employee/manager
  names, the State Street wordmark/logo text, and console-logged email
  content in `server/index.ts` remain English-only regardless of UI
  language.

## 6. Acceptance Criteria

**Categorization**
- Given ≥1 uncategorized transaction, clicking "Categorize" calls
  `/api/categorize` once per uncategorized transaction (sequentially) and
  each row updates with its category as the response arrives.
- After categorization completes, policy check runs automatically against
  all transactions.

**Receipt upload**
- Uploading a file outside `image/*`, `application/pdf`, `text/html` is
  rejected client-side with a translated error, no network call made.
- A receipt within 5% amount and 3 days of an existing transaction attaches
  to that transaction (`source` becomes `'receipt'`) and shows a "matched"
  notification naming the matched transaction ID.
- A receipt with no match creates a new transaction with a `RCP-<timestamp>`
  id, is policy-checked immediately, and shows an "added" notification.

**Policy check**
- TXN-007 (Nobu, $245 ÷ 3 attendees = $81.67/person, Meals & Dining) always
  evaluates as a violation (exceeds $75/person limit).
- TXN-009 (InterContinental, $395/night, Hotel & Lodging) evaluates as
  compliant (within the $450/night limit).
- Meal per-person checks divide `amount` by `attendees` (default 1 if
  unset) before comparing to the category's per-person `maxAmount`; the
  generic flat-amount check is skipped for `Meals & Dining` since its limit
  is per-person, not per-transaction.
- A transaction with no category yet returns `compliant: true` with a
  "pending" warning rather than false-flagging.

**Report**
- Report excludes transactions with `category === null`.
- Category breakdown percentages sum to 100% (subject to rounding display).
- Violations section renders only when `violations.length > 0`; same for
  warnings.
- "Notify Manager" disables its button while the request is in flight and
  shows either a success confirmation (recipient email) or an inline error.

**Localization**
- Toggling language re-renders all three tab views (Transactions, Policy,
  Report) with `zh` strings, including category labels, without a page
  reload.

**Resilience**
- If `GET /api/health` fails on load, the persistent backend-unreachable
  banner renders and remains until a successful navigation/reload; it does
  not block using cached/local functionality (e.g., viewing seeded
  transactions).

## 7. Non-Functional Constraints

- No secrets in frontend bundle; only `GOOGLE_CLOUD_PROJECT` /
  `GOOGLE_CLOUD_LOCATION` / `PORT` are read server-side from `.env`.
- Body size limit: `express.json({ limit: '20mb' })` to accommodate
  base64-encoded receipt images/PDFs.
- TypeScript `strict: true`; target `ES2020`; no emit (Vite/tsc handle
  build separately per `npm run build` = `tsc && vite build`).
- Single Cloud Run service, stateless — safe to scale horizontally since no
  server-side session state exists (all state is client-side, per tab
  session).

## 8. Known Gaps (carried from PRD Risks)

- No automated tests (unit or e2e) exist for `policyChecker.ts`,
  `findMatchingTransaction`, or the API endpoints.
- No persistence: all transaction/report state is lost on reload.
- i18n coverage is partial (see §5).
- Gemini output parsing (`process-receipt`) assumes well-formed JSON in the
  response text; a malformed response throws and surfaces as a generic
  "Receipt processing failed" error to the user.
