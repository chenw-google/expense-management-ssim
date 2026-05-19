import { useState, useRef } from 'react';
import { Transaction, SpendingCategory } from '../types';
import { categorizeAllTransactions, processReceiptImage, ReceiptData } from '../services/geminiService';
import { checkAllTransactions, checkPolicy } from '../services/policyChecker';

const CATEGORY_COLORS: Record<string, string> = {
  'Meals & Dining': 'bg-orange-100 text-orange-800',
  'Hotel & Lodging': 'bg-purple-100 text-purple-800',
  'Rideshare & Taxi': 'bg-cyan-100 text-cyan-800',
  'Airfare': 'bg-blue-100 text-blue-800',
  'Office Supplies': 'bg-gray-100 text-gray-800',
  'Entertainment': 'bg-pink-100 text-pink-800',
  'Conference & Training': 'bg-indigo-100 text-indigo-800',
  'Parking & Tolls': 'bg-yellow-100 text-yellow-800',
  'Other': 'bg-slate-100 text-slate-800',
};

const ACCEPTED_FILE_TYPES = 'image/*,application/pdf,text/html';

interface Props {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onAddTransaction: (tx: Transaction) => void;
  model: string;
}

interface ReceiptNotification {
  type: 'matched' | 'added';
  vendor: string;
  amount: number;
  matchedId?: string;
}

function findMatchingTransaction(receipt: ReceiptData, transactions: Transaction[]): Transaction | null {
  const receiptDate = new Date(receipt.date).getTime();
  const scored = transactions
    .map((tx) => {
      const amountDiff = Math.abs(tx.amount - receipt.amount) / (receipt.amount || 1);
      const txVendor = tx.vendor.toLowerCase();
      const rcVendor = receipt.vendor.toLowerCase();
      const vendorMatch = txVendor.includes(rcVendor) || rcVendor.includes(txVendor);
      const txDate = new Date(tx.date).getTime();
      const daysDiff = Math.abs(txDate - receiptDate) / (1000 * 60 * 60 * 24);
      if (amountDiff > 0.05 || daysDiff > 3) return null;
      return { tx, score: (vendorMatch ? 2 : 0) + (1 - amountDiff) + (1 - daysDiff / 3) };
    })
    .filter((x): x is { tx: Transaction; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.tx ?? null;
}

export default function TransactionTable({ transactions, onUpdateTransaction, onAddTransaction, model }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptProcessing, setReceiptProcessing] = useState(false);
  const [notification, setNotification] = useState<ReceiptNotification | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCategorize = async () => {
    setError('');
    setLoading(true);
    try {
      const uncategorized = transactions.filter((tx) => !tx.category);
      await categorizeAllTransactions(uncategorized, model, (id, category) => {
        onUpdateTransaction(id, { category });
      });
      const updatedAll = transactions.map((tx) => ({ ...tx, category: tx.category as SpendingCategory }));
      const checked = checkAllTransactions(updatedAll);
      checked.forEach((tx) => onUpdateTransaction(tx.id, { policyStatus: tx.policyStatus }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Categorization failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPolicyCheck = () => {
    const checked = checkAllTransactions(transactions);
    checked.forEach((tx) => onUpdateTransaction(tx.id, { policyStatus: tx.policyStatus }));
  };

  const handleReceiptFile = async (file: File) => {
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'text/html';
    if (!allowed) {
      setError('Unsupported file type. Please upload an image, PDF, or HTML file.');
      return;
    }
    setReceiptProcessing(true);
    setNotification(null);
    try {
      const base64 = await fileToBase64(file);
      const data = await processReceiptImage(base64, file.type, model);
      const match = findMatchingTransaction(data, transactions);

      if (match) {
        onUpdateTransaction(match.id, {
          receiptImage: file.type.startsWith('image/') ? `data:${file.type};base64,${base64}` : match.receiptImage,
          source: 'receipt',
        });
        setNotification({ type: 'matched', vendor: data.vendor, amount: data.amount, matchedId: match.id });
      } else {
        const newTx: Transaction = {
          id: `RCP-${Date.now()}`,
          vendor: data.vendor,
          date: data.date,
          amount: data.amount,
          category: data.category,
          description: data.lineItems.slice(0, 3).join(', '),
          source: 'receipt',
          receiptImage: file.type.startsWith('image/') ? `data:${file.type};base64,${base64}` : undefined,
          location: data.location,
        };
        newTx.policyStatus = checkPolicy(newTx);
        onAddTransaction(newTx);
        setNotification({ type: 'added', vendor: data.vendor, amount: data.amount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt processing failed — is the backend running?');
    } finally {
      setReceiptProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const categorized = transactions.filter((tx) => tx.category).length;
  const violationCount = transactions.filter((tx) => tx.policyStatus && !tx.policyStatus.compliant).length;
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const uncategorized = transactions.filter((tx) => !tx.category).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Transactions', value: transactions.length, color: 'text-slate-900' },
          { label: 'Categorized', value: categorized, color: 'text-blue-600' },
          { label: 'Policy Violations', value: violationCount, color: violationCount > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Total Amount', value: `$${total.toFixed(2)}`, color: 'text-slate-900' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Receipt notification */}
      {notification && (
        <div className={`rounded-xl border px-5 py-3 text-sm flex items-center justify-between ${
          notification.type === 'matched'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span>
            {notification.type === 'matched'
              ? `✓ Receipt matched and linked to ${notification.matchedId} — ${notification.vendor} $${notification.amount.toFixed(2)}`
              : `＋ No match found — added "${notification.vendor}" ($${notification.amount.toFixed(2)}) as a new expense`}
          </span>
          <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Bank Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {categorized}/{transactions.length} categorized · {uncategorized} pending
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleReceiptFile(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={receiptProcessing}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {receiptProcessing
                ? <><span className="animate-spin inline-block">⟳</span> Processing…</>
                : <>🧾 Upload Receipt</>}
            </button>
            <button
              onClick={handleRunPolicyCheck}
              disabled={categorized === 0}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Check Policy
            </button>
            <button
              onClick={handleCategorize}
              disabled={loading || uncategorized === 0}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
            >
              {loading && <span className="animate-spin inline-block">⟳</span>}
              {loading ? 'Categorizing…' : 'Categorize with Gemini AI'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-4 opacity-50 hover:opacity-100 font-bold">✕</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Receipt</th>
                <th className="px-5 py-3 font-medium">Policy</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isViolation = tx.policyStatus && !tx.policyStatus.compliant;
                const hasWarnings = tx.policyStatus?.compliant && (tx.policyStatus.warnings.length ?? 0) > 0;
                const hasPolicyNotes = isViolation || hasWarnings;

                return (
                  <tr key={tx.id} className="group">
                    {/* Main transaction row — no bottom border if notes follow */}
                    <td colSpan={8} className="p-0">
                      <table className="w-full">
                        <tbody>
                          <tr className={`transition-colors ${
                            isViolation
                              ? 'bg-red-50 hover:bg-red-50'
                              : 'hover:bg-slate-50'
                          } ${hasPolicyNotes ? '' : 'border-b border-slate-50'}`}>
                            <td className="px-5 py-3.5 font-mono text-xs text-slate-500 w-28">{tx.id}</td>
                            <td className="px-5 py-3.5 text-slate-600 w-28">{tx.date}</td>
                            <td className="px-5 py-3.5 font-medium text-slate-900 w-40">{tx.vendor}</td>
                            <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate" title={tx.description}>
                              {tx.description ?? '—'}
                            </td>
                            <td className="px-5 py-3.5 w-44">
                              {loading && !tx.category ? (
                                <span className="text-xs text-slate-400 animate-pulse">Categorizing…</span>
                              ) : tx.category ? (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[tx.category] ?? 'bg-slate-100 text-slate-700'}`}>
                                  {tx.category}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Pending</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-slate-900 w-28">
                              ${tx.amount.toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5 w-24">
                              {tx.receiptImage ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 w-28">
                              <PolicyBadge policyStatus={tx.policyStatus} />
                            </td>
                          </tr>

                          {/* Inline policy notes row */}
                          {hasPolicyNotes && tx.policyStatus && (
                            <tr className={`border-b border-slate-50 ${isViolation ? 'bg-red-50' : 'bg-amber-50'}`}>
                              <td colSpan={8} className={`px-5 pb-3 pt-0`}>
                                <div className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${
                                  isViolation
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-amber-50 border-amber-200'
                                }`}>
                                  {tx.policyStatus.violations.map((v, i) => (
                                    <p key={`v-${i}`} className="text-red-700 flex items-start gap-1.5">
                                      <span className="mt-0.5 shrink-0">❌</span><span>{v}</span>
                                    </p>
                                  ))}
                                  {tx.policyStatus.warnings.map((w, i) => (
                                    <p key={`w-${i}`} className="text-amber-700 flex items-start gap-1.5">
                                      <span className="mt-0.5 shrink-0">⚠️</span><span>{w}</span>
                                    </p>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PolicyBadge({ policyStatus }: { policyStatus?: Transaction['policyStatus'] }) {
  if (!policyStatus) return <span className="text-xs text-slate-300">—</span>;
  if (!policyStatus.compliant) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
        ❌ Violation
      </span>
    );
  }
  if (policyStatus.warnings.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
        ⚠️ Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
      ✓ OK
    </span>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
