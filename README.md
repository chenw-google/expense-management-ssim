# ExpenseIQ — State Street Expense Manager

AI-powered corporate expense management demo built with React, Express, and Google Gemini on Vertex AI.

---

## Repository Structure

```
expense/
├── server/
│   └── index.ts          # Express backend — Gemini API calls, email sending
├── src/
│   ├── components/
│   │   ├── Header.tsx        # Top banner, model selector (MODELS list lives here)
│   │   ├── TransactionTable.tsx  # Transactions tab — categorize, upload receipt, policy inline
│   │   ├── ExpenseReport.tsx # Report tab — summary, print, notify manager
│   │   └── PolicyPanel.tsx   # Policy reference tab
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
- `gcloud` CLI authenticated

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate with Google Cloud

```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/gmail.send
```

> The `gmail.send` scope is required for the "Notify Manager" button. If you don't need email, you can omit it.

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

This starts both the Express backend (port 3001) and the Vite dev server (port 5173) in a single terminal. Open [http://localhost:5173](http://localhost:5173).

The backend auto-reloads on changes to `server/index.ts`.

---

## Features

| Tab | Description |
|---|---|
| **Transactions** | View bank transactions, categorize with Gemini AI, check policy, upload receipts (image/PDF/HTML) |
| **Policy** | Browse the company expense policy rules |
| **Expense Report** | Generate a formatted report, print to PDF, email manager notification |

**Receipt upload** — drop an image, PDF, or HTML file. Gemini extracts vendor, amount, date, and category. If the receipt matches an existing transaction (within 5% amount, 3 days, similar vendor), it links automatically. Otherwise it adds a new expense item.

**Model selector** — switch Gemini models in the header dropdown. Takes effect on the next API call.

---

## Deploying to Cloud Run

### 1. Build and push the container

```bash
PROJECT_ID=$(gcloud config get-value project)
IMAGE="gcr.io/$PROJECT_ID/expenseiq"

gcloud builds submit --tag $IMAGE
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy expenseiq \
  --image $IMAGE \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1 \
  --service-account YOUR_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
```

> Replace `YOUR_SERVICE_ACCOUNT` with a service account that has the **Vertex AI User** role. For email sending, it also needs the **Gmail API** enabled and domain-wide delegation configured.

### 3. (Optional) Use a service account for authentication

Instead of Application Default Credentials, attach a service account to the Cloud Run service:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

The app will automatically use the attached service account — no credentials file needed.

### Production build (local test before deploy)

```bash
npm run build      # builds React into dist/
npm run preview    # serves dist/ + backend on PORT (default 3001)
```
