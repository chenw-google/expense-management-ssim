import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
if (!PROJECT) {
  console.error('ERROR: GOOGLE_CLOUD_PROJECT environment variable is required');
  process.exit(1);
}
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
const MODEL = 'gemini-2.5-flash';

// Use Vertex AI backend with Application Default Credentials
const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT,
  location: LOCATION,
});

const CATEGORIES = [
  'Meals & Dining',
  'Hotel & Lodging',
  'Rideshare & Taxi',
  'Airfare',
  'Office Supplies',
  'Entertainment',
  'Conference & Training',
  'Parking & Tolls',
  'Other',
];

// POST /api/categorize — categorize a single bank transaction
app.post('/api/categorize', async (req, res) => {
  const { vendor, amount, description, model: reqModel } = req.body as {
    vendor: string;
    amount: number;
    description?: string;
    model?: string;
  };

  const prompt = `You are an expense categorization assistant. Given a vendor name, amount, and optional description, return exactly one category from this list:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Vendor: ${vendor}
Amount: $${amount}
${description ? `Description: ${description}` : ''}

Respond with ONLY the category name, exactly as listed above. No explanation.`;

  try {
    const result = await ai.models.generateContent({ model: reqModel ?? MODEL, contents: prompt });
    const text = result.text?.trim() ?? 'Other';
    const matched = CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? 'Other';
    res.json({ category: matched });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[categorize]', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/process-receipt — extract data from a receipt image
app.post('/api/process-receipt', async (req, res) => {
  const { imageBase64, mimeType, model: reqModel } = req.body as {
    imageBase64: string;
    mimeType: string;
    model?: string;
  };

  const prompt = `You are a receipt parsing assistant. Analyze this receipt image and extract the following information. Return a JSON object with exactly these fields:

{
  "vendor": "business name",
  "date": "YYYY-MM-DD format, use today if unclear",
  "amount": total amount as a number (no currency symbols),
  "location": "city, state if visible, else empty string",
  "category": one of: ${CATEGORIES.join(' | ')},
  "lineItems": ["array", "of", "line", "items", "with", "prices"],
  "confidence": "high" | "medium" | "low"
}

Rules:
- amount must be the final total including tax and tip
- date must be YYYY-MM-DD
- category must be exactly one of the listed options
- If a field is not visible, use an empty string or 0 for amount
- Respond ONLY with the JSON object, no markdown, no explanation`;

  try {
  // HTML: decode and embed as text; PDF and images: send as inline data
  let contents;
  if (mimeType === 'text/html') {
    const htmlText = Buffer.from(imageBase64, 'base64').toString('utf-8');
    const plainText = htmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    contents = [{ role: 'user', parts: [{ text: `${prompt}\n\nReceipt content:\n${plainText}` }] }];
  } else {
    contents = [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: imageBase64, mimeType } }] }];
  }

  const result = await ai.models.generateContent({
    model: reqModel ?? MODEL,
    contents,
  });
    const text = result.text?.trim() ?? '';
    const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonText);

    res.json({
      vendor: parsed.vendor ?? 'Unknown Vendor',
      date: parsed.date ?? new Date().toISOString().split('T')[0],
      amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
      location: parsed.location ?? '',
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      confidence: parsed.confidence ?? 'medium',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[process-receipt]', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/send-report — simulate sending an expense report notification email
const DEMO_RECIPIENT = 'dev@chenkeamonwang.altostrat.com';

app.post('/api/send-report', (req, res) => {
  const { reportId, employeeName, managerEmail, period, total, violations, transactionCount } = req.body as {
    reportId: string;
    employeeName: string;
    managerEmail: string;
    period: string;
    total: number;
    violations: number;
    transactionCount: number;
  };

  const complianceStatus = violations === 0 ? 'Compliant' : `${violations} violation(s) require review`;

  // Log the full email to the server console (demo mode)
  console.log('\n' + '─'.repeat(60));
  console.log(`[send-report] DEMO EMAIL`);
  console.log(`  To:          ${DEMO_RECIPIENT}`);
  console.log(`  Manager:     ${managerEmail}`);
  console.log(`  Subject:     Expense Report ${reportId} — ${employeeName} — Approval Required`);
  console.log(`  Report ID:   ${reportId}`);
  console.log(`  Employee:    ${employeeName}`);
  console.log(`  Period:      ${period}`);
  console.log(`  Transactions:${transactionCount}`);
  console.log(`  Total:       $${total.toFixed(2)}`);
  console.log(`  Compliance:  ${complianceStatus}`);
  console.log('─'.repeat(60) + '\n');

  res.json({ success: true, recipient: DEMO_RECIPIENT });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ project: PROJECT, location: LOCATION, model: MODEL });
});

// Serve React frontend in production
const distDir = join(__dirname, '../dist');
app.use(express.static(distDir));
app.get('/{*path}', (_req, res) => res.sendFile(join(distDir, 'index.html')));

const PORT = parseInt(process.env.PORT ?? '3001');
app.listen(PORT, () => {
  console.log(`ExpenseIQ on http://localhost:${PORT}`);
  console.log(`  Project: ${PROJECT}  |  Location: ${LOCATION}  |  Model: ${MODEL}`);
  console.log(`  Auth: Application Default Credentials`);
});
