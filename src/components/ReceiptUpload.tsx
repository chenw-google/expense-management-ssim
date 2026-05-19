import { useState, useRef, DragEvent } from 'react';
import { Transaction } from '../types';
import { processReceiptImage } from '../services/geminiService';
import { checkPolicy } from '../services/policyChecker';

interface Props {
  onTransactionAdded: (tx: Transaction) => void;
  model: string;
}

export default function ReceiptUpload({ onTransactionAdded, model }: Props) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP, etc.)');
      return;
    }

    setError('');
    setResult(null);
    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const base64 = await fileToBase64(file);
      const data = await processReceiptImage(base64, file.type, model);

      const tx: Transaction = {
        id: `RCP-${Date.now()}`,
        vendor: data.vendor,
        date: data.date,
        amount: data.amount,
        category: data.category,
        description: data.lineItems.slice(0, 3).join(', '),
        source: 'receipt',
        receiptImage: `data:${file.type};base64,${base64}`,
        location: data.location,
      };
      tx.policyStatus = checkPolicy(tx);
      setResult(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process receipt — is the backend running?');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (result) {
      onTransactionAdded(result);
      setResult(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-1">Upload Receipt</h2>
        <p className="text-sm text-slate-500 mb-5">
          Gemini vision extracts vendor, date, amount, location, and category automatically.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-600 font-medium">Processing receipt with Gemini…</p>
              <p className="text-xs text-slate-400">Extracting vendor, amount, date, and category</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl">🧾</span>
              <p className="text-sm font-medium text-slate-700">Drop a receipt image here, or click to browse</p>
              <p className="text-xs text-slate-400">Supports JPEG, PNG, WebP, HEIC</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {(preview || result) && (
        <div className="grid grid-cols-2 gap-6">
          {preview && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Receipt Image</h3>
              <img src={preview} alt="Receipt" className="rounded-lg max-h-80 object-contain mx-auto" />
            </div>
          )}
          {result && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Extracted Data</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  result.policyStatus?.compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {result.policyStatus?.compliant ? '✓ Policy OK' : '❌ Policy Violation'}
                </span>
              </div>
              <dl className="space-y-2 text-sm">
                {([
                  ['Vendor', result.vendor],
                  ['Date', result.date],
                  ['Amount', `$${result.amount.toFixed(2)}`],
                  ['Location', result.location || '—'],
                  ['Category', result.category],
                  ['Items', result.description || '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-20 text-slate-500 shrink-0">{label}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {result.policyStatus?.violations && result.policyStatus.violations.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-800 mb-1">Violations</p>
                  {result.policyStatus.violations.map((v, i) => (
                    <p key={i} className="text-xs text-red-700">• {v}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Add to Transactions
                </button>
                <button
                  onClick={() => { setResult(null); setPreview(null); }}
                  className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
