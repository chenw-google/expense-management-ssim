import { SpendingCategory, Transaction } from '../types';

const CATEGORIES: SpendingCategory[] = [
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

// Categorize a single bank transaction via local backend (uses ADC)
export async function categorizeTransaction(
  vendor: string,
  amount: number,
  model: string,
  description?: string
): Promise<SpendingCategory> {
  const res = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor, amount, description, model }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Categorization failed: ${body.error ?? res.statusText}`);
  }
  const { category } = await res.json();
  return CATEGORIES.includes(category) ? category : 'Other';
}

// Categorize all uncategorized transactions sequentially
export async function categorizeAllTransactions(
  transactions: Transaction[],
  model: string,
  onProgress?: (id: string, category: SpendingCategory) => void
): Promise<Map<string, SpendingCategory>> {
  const results = new Map<string, SpendingCategory>();
  for (const tx of transactions) {
    const category = await categorizeTransaction(tx.vendor, tx.amount, model, tx.description);
    results.set(tx.id, category);
    onProgress?.(tx.id, category);
  }
  return results;
}

export interface ReceiptData {
  vendor: string;
  date: string;
  amount: number;
  location: string;
  category: SpendingCategory;
  lineItems: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Process a receipt image via local backend (uses ADC + Gemini vision)
export async function processReceiptImage(
  imageBase64: string,
  mimeType: string,
  model: string
): Promise<ReceiptData> {
  const res = await fetch('/api/process-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, model }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Receipt processing failed: ${text}`);
  }
  return res.json();
}
