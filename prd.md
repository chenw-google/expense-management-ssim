# ExpenseIQ — Product Requirements Document

**Status:** Draft
**Last updated:** 2026-07-17

## 1. Overview

ExpenseIQ ("State Street Expense Manager") is an AI-powered corporate expense
management demo. It shows an employee's expense workflow end-to-end —
reviewing bank-sourced transactions, categorizing them with Gemini, uploading
receipts for automatic reconciliation, checking spend against a company
travel & expense policy, and generating a submission-ready expense report.
The app is a demo/proof-of-concept: single hard-coded employee, mock
transaction data, no persistent storage, and no real email delivery.

## 2. Problem Statement

Expense submission is manual and error-prone: employees categorize spend by
hand, don't always know which policy limits apply, and reports are compiled
from scratch. ExpenseIQ demonstrates how an LLM (Gemini, via Vertex AI) can
remove the manual categorization and receipt-transcription work, surface
policy violations before submission instead of after, and produce a
formatted, board-ready report automatically.

## 3. Goals

- Categorize bank transactions into spending categories automatically via
  Gemini, with the employee able to trigger and observe the process.
- Extract vendor/date/amount/category from an uploaded receipt (image, PDF,
  or HTML) via Gemini vision, and reconcile it against existing transactions.
- Evaluate every transaction against a configurable company policy and
  surface violations/warnings inline, before report submission.
- Produce a formatted expense report (summary, itemized table, category
  chart, violations, approval block) that can be printed/exported to PDF and
  "sent" to a manager.
- Support switching the underlying Gemini model at runtime for comparison.
- Support a bilingual UI (English / Chinese) as a localization proof point.

### Non-Goals

- Real user accounts, authentication, or multi-employee/tenant support.
- Persistent storage of transactions or reports (state is in-memory, per
  session, seeded from mock data).
- Real email delivery (manager notification is demo/console-logged today).
- Multi-currency support.
- Automated test coverage.

## 4. Users

- **Employee (submitter)** — the only active user role today. Reviews
  transactions, runs categorization, uploads receipts, checks policy,
  generates and "sends" the report. Hard-coded as Jane Smith (E001, Business
  Development) in the demo.
- **Manager (approver)** — referenced as the notification recipient
  (John Doe) and in the report's approval block. Not an interactive role in
  this demo; notifications are logged server-side rather than delivered.
- **Finance** — referenced in the report's approval block as the final
  sign-off. Not an interactive role.

## 5. Features & Functional Requirements

### 5.1 Transaction Table (FR-1.x)

- **FR-1.1** Display the employee's transactions (bank-sourced mock data
  plus any added via receipt upload) in a table: ID, date, vendor,
  description, category, amount, receipt status, policy status.
- **FR-1.2** Show live stats: total transaction count, number categorized,
  number of policy violations, total amount.
- **FR-1.3** "Categorize" action sends each uncategorized transaction to
  Gemini sequentially and fills in its category as results arrive.
- **FR-1.4** "Check Policy" action evaluates every transaction against the
  company policy and attaches violation/warning results.
- **FR-1.5** Inline policy notes render directly under a transaction row
  when it has a violation or warning, without needing a separate view.

### 5.2 Receipt Capture & Reconciliation (FR-2.x)

- **FR-2.1** Employee can upload a receipt as an image, PDF, or HTML file.
- **FR-2.2** Gemini vision extracts vendor, date, total amount, location,
  category, line items, and a confidence level from the receipt.
- **FR-2.3** The extracted receipt is matched against existing transactions
  by amount (within 5%) and date (within 3 days), with vendor-name overlap
  used as a tiebreaker.
- **FR-2.4** On a match, the existing transaction is marked as receipt-backed
  (`source: 'receipt'`) and the image is attached; the employee sees a
  "matched" confirmation.
- **FR-2.5** When no match is found, a new transaction is created from the
  receipt data and automatically policy-checked; the employee sees an
  "added" confirmation.

### 5.3 Policy Compliance (FR-3.x)

- **FR-3.1** Company policy defines, per spending category: a max amount,
  whether a receipt is required, whether pre-approval is required, and an
  optional pre-approval dollar threshold.
- **FR-3.2** A transaction exceeding its category's max amount is flagged as
  a violation with the overage amount stated.
- **FR-3.3** Meals over the per-person limit, or missing an attendee/purpose
  description, are flagged (violation and warning respectively).
- **FR-3.4** Transactions over $100 without an attached receipt are flagged
  with a warning when the category requires one.
- **FR-3.5** Categories requiring pre-approval, or transactions crossing a
  category's pre-approval threshold, are flagged with a warning.
- **FR-3.6** Airfare over $600 is flagged as a violation requiring VP+
  pre-approval.
- **FR-3.7** Policy Panel displays the full rule set (limits, receipt/
  pre-approval requirements) and the general policy rules for reference.

### 5.4 Expense Report (FR-4.x)

- **FR-4.1** Report includes: header (employee/report info), executive
  summary (total, transaction count, violation count, compliance status),
  itemized transaction table, category breakdown with a donut chart,
  a violations section (when any exist), a warnings section (when any
  exist), and a three-party approval block (employee/manager/finance).
- **FR-4.2** Only categorized transactions are included in the report.
- **FR-4.3** Report ID is generated as `EXP-YYYYMM-E001-001`.
- **FR-4.4** "Print / Export" triggers the browser print dialog for
  PDF export.
- **FR-4.5** "Notify Manager" posts report summary data to the backend,
  which logs a formatted notification email server-side (demo mode) and
  returns a confirmation shown in the UI.

### 5.5 Model Selection (FR-5.x)

- **FR-5.1** Header exposes a dropdown of available Gemini models
  (2.5 Flash, 2.5 Pro, 2.5 Flash Lite, 3.5 Flash, 3.1 Pro Preview).
- **FR-5.2** The selected model is used for the next categorization or
  receipt-processing call; default is read from the backend health check.

### 5.6 Localization (FR-6.x)

- **FR-6.1** UI text is translatable between English and Chinese via a
  language toggle available on the Transactions, Policy, and Report views.
- **FR-6.2** Spending category labels are translated alongside general UI
  strings.

## 6. Non-Functional Requirements

- **Performance:** Categorization runs sequentially per transaction; this is
  acceptable at demo scale (~10–20 transactions) but does not need to scale
  further.
- **Availability/Resilience:** If the backend is unreachable, the UI shows a
  persistent error banner rather than failing silently.
- **Security:** No end-user secrets are stored client-side; Gemini access
  uses server-side Application Default Credentials against a Google Cloud
  project. Receipt images are sent inline to the backend, not persisted.
- **Portability:** Ships as a single Docker container (static frontend +
  Express server) deployable to Cloud Run.
- **Accessibility:** Not currently addressed — known gap, not required for
  demo purposes.

## 7. Out of Scope

- Database/persistent storage (all state is in-memory, reset on reload).
- Real authentication/authorization for employees or managers.
- Real Gmail/email delivery (Gmail `gmail.send` scope is documented but not
  enabled).
- Multi-employee, multi-department, or org-hierarchy support.
- Multi-currency handling.
- Automated test suite.

## 8. Success Metrics

- The seeded policy violation (TXN-007, $245 ÷ 3 attendees meal overage) is
  correctly caught by the policy checker in every demo run.
- Categorization requires no manual correction in a typical demo run
  (qualitative — reviewed per demo, not currently measured automatically).
- Report generation, print, and notify-manager complete without error in a
  single sitting demo.

**Counter-metric:** categorization/extraction should not silently
mis-categorize in ways that would erode a live audience's trust in the demo
(e.g., defaulting everything to "Other").

## 9. Risks & Open Questions

- Gemini categorization/extraction accuracy on ambiguous vendors or
  low-quality receipt images is not currently measured or bounded.
- All state is in-memory; a page reload loses all categorization, receipts,
  and policy-check results.
- Localization coverage has not been audited for completeness (e.g., fixed
  strings like employee/manager names and the State Street wordmark remain
  English-only).
- `[ASSUMPTION]` Primary audience is internal stakeholder/sales demos, not
  production end users — this shapes the non-goals above. Confirm if this
  is intended to evolve toward a production tool.
