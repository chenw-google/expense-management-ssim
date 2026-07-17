# ExpenseIQ — State Street Expense Manager

AI-powered corporate expense management demo built with React, Express, and Google Gemini on Vertex AI.

---

## Repository Structure

```
expense/
├── server/
│   └── index.ts          # Express backend — Gemini API calls, email notification
├── src/
│   ├── components/
│   │   ├── Header.tsx            # Top banner, model selector (MODELS list lives here)
│   │   ├── TransactionTable.tsx  # Transactions tab — categorize, upload receipt, inline policy notes
│   │   ├── ExpenseReport.tsx     # Report tab — summary, print, notify manager
│   │   └── PolicyPanel.tsx       # Policy reference tab
│   ├── data/
│   │   ├── mockTransactions.ts   # Sample bank transactions
│   │   ├── companyPolicy.ts      # Expense policy rules (limits, receipt requirements)
│   │   └── reportGuidelines.ts   # Report format and submission rules
│   ├── services/
│   │   ├── geminiService.ts      # Frontend API calls to /api/* endpoints
│   │   └── policyChecker.ts      # Client-side policy evaluation logic
│   └── types/index.ts            # Shared TypeScript types
├── .env                  # Local secrets (not committed)
├── .env.example          # Required environment variables
├── Dockerfile            # Production container
└── package.json
```

**To change the available Gemini models**, edit the `MODELS` array at the top of `src/components/Header.tsx`.

---

## Running Locally

### Prerequisites

- Node.js 20+
- A Google Cloud project with **Vertex AI API** enabled
- `gcloud` CLI installed and authenticated

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate with Google Cloud

```bash
gcloud auth application-default login
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your project ID:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
PORT=3001
```

### 4. Start the app

```bash
npm run dev
```

This starts both the Express backend (port 3001, auto-reloads on changes) and the Vite dev server (port 5173) in a single terminal. Open [http://localhost:5173](http://localhost:5173).

---

## Features

| Tab | Description |
|---|---|
| **Transactions** | View bank transactions, categorize with Gemini AI, check policy, upload receipts |
| **Policy** | Browse the company expense policy rules and limits |
| **Expense Report** | Generate a formatted report, print to PDF, send manager notification |

**Receipt upload** — upload an image, PDF, or HTML file directly from the Transactions tab. Gemini extracts vendor, amount, date, and category. If the receipt matches an existing transaction (within 5% amount, 3 days, similar vendor name), it links automatically. Otherwise it adds a new expense item.

**Inline policy notes** — after running "Check Policy", violations and warnings appear directly below each affected transaction row.

**Model selector** — switch Gemini models from the header dropdown. Takes effect on the next API call.

**Notify Manager** — sends a manager notification email. In demo mode, the email content is logged to the server console and a confirmation is shown in the UI. To enable real sending, see the Gmail API note below.

> **Gmail sending:** The "Notify Manager" button currently runs in demo mode (logs to console). To enable real email delivery, a Google Workspace admin must allow the `gmail.send` OAuth scope for the domain under **Admin Console → Security → API controls → Manage Google Services → Gmail**.

---

## Deploying to Cloud Run

The simplest way to deploy — Cloud Build handles the container build automatically:

```bash
gcloud run deploy expenseiq \
  --source . \
  --region us-central1 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project),GOOGLE_CLOUD_LOCATION=us-central1
```

This builds the Docker image via Cloud Build, pushes it to Artifact Registry, and deploys to Cloud Run in one step. Re-running the same command updates the existing service in place.

### Service account permissions

The Cloud Run service account needs the **Vertex AI User** role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Local production build

```bash
npm run build      # compiles React into dist/
npm run preview    # serves dist/ + backend together on PORT (default 3001)
```
