import { useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { reportGuidelines } from '../data/reportGuidelines';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316',
  '#84cc16', '#ec4899', '#6366f1', '#eab308', '#94a3b8',
];

interface Props {
  transactions: Transaction[];
}

const MANAGER_EMAIL = 'john.doe@statestreet.com';
const DEMO_RECIPIENT = 'dev@chenkeamonwang.altostrat.com';

export default function ExpenseReport({ transactions: allTransactions }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  const transactions = allTransactions.filter((tx) => tx.category);

  const { categoryBreakdown, violations, total, warnings } = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const viols: Transaction[] = [];
    const warns: Transaction[] = [];
    let sum = 0;

    for (const tx of transactions) {
      const cat = tx.category ?? 'Other';
      breakdown[cat] = (breakdown[cat] ?? 0) + tx.amount;
      sum += tx.amount;
      if (tx.policyStatus && !tx.policyStatus.compliant) viols.push(tx);
      else if (tx.policyStatus && tx.policyStatus.warnings.length > 0) warns.push(tx);
    }

    return { categoryBreakdown: breakdown, violations: viols, total: sum, warnings: warns };
  }, [transactions]);

  const chartData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

  const dates = transactions.map((tx) => tx.date).sort();
  const periodStart = dates[0] ?? '—';
  const periodEnd = dates[dates.length - 1] ?? '—';

  const reportId = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-E001-001`;

  const handlePrint = () => window.print();

  const handleSendReport = async () => {
    setSending(true);
    setSendStatus('idle');
    setSendError('');
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          employeeName: 'Jane Smith',
          managerEmail: MANAGER_EMAIL,
          period: `${periodStart} → ${periodEnd}`,
          total,
          violations: violations.length,
          transactionCount: transactions.length,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      setSendStatus('success');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send');
      setSendStatus('error');
    } finally {
      setSending(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <span className="text-5xl">📊</span>
        <p className="text-slate-600 mt-4 font-medium">No categorized transactions yet</p>
        <p className="text-slate-400 text-sm mt-1">
          Go to Transactions and run "Categorize with Gemini AI" first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-slate-900">{reportGuidelines.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Report ID: {reportId}</p>
        </div>
        <div className="flex items-center gap-3">
          {sendStatus === 'success' && (
            <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              ✓ Sent to {DEMO_RECIPIENT}
            </span>
          )}
          {sendStatus === 'error' && (
            <span className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg max-w-xs truncate" title={sendError}>
              ✕ {sendError}
            </span>
          )}
          <button
            onClick={handleSendReport}
            disabled={sending}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {sending ? <><span className="animate-spin">⟳</span> Sending…</> : <>✉️ Notify Manager</>}
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            🖨️ Print / Export PDF
          </button>
        </div>
      </div>

      {/* Report body */}
      <div ref={reportRef} className="bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-0">
        {/* Section 1: Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-xl print:bg-white">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Employee Information</p>
              <dl className="space-y-1 text-sm">
                <ReportField label="Name" value="Jane Smith" />
                <ReportField label="Employee ID" value="E001" />
                <ReportField label="Department" value="Business Development" />
                <ReportField label="Manager" value="John Doe" />
                <ReportField label="Manager Email" value={MANAGER_EMAIL} />
              </dl>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Report Details</p>
              <dl className="space-y-1 text-sm">
                <ReportField label="Report ID" value={reportId} />
                <ReportField label="Period" value={`${periodStart} → ${periodEnd}`} />
                <ReportField label="Submitted" value={new Date().toISOString().split('T')[0]} />
                <ReportField label="Submission Due" value={reportGuidelines.submissionDeadline} />
              </dl>
            </div>
          </div>
        </div>

        {/* Section 2: Executive Summary */}
        <div className="px-8 py-5 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Executive Summary
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <SummaryCard label="Total Expenses" value={`$${total.toFixed(2)}`} color="text-slate-900" />
            <SummaryCard label="Transactions" value={String(transactions.length)} color="text-blue-600" />
            <SummaryCard
              label="Policy Violations"
              value={String(violations.length)}
              color={violations.length > 0 ? 'text-red-600' : 'text-green-600'}
            />
            <SummaryCard
              label="Compliance Status"
              value={violations.length === 0 ? 'Compliant' : 'Review Required'}
              color={violations.length === 0 ? 'text-green-600' : 'text-red-600'}
            />
          </div>
        </div>

        {/* Section 3: Itemized Expenses */}
        <div className="px-8 py-5 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Itemized Expenses
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...transactions]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((tx) => {
                  const isViolation = tx.policyStatus && !tx.policyStatus.compliant;
                  return (
                    <tr key={tx.id} className={isViolation ? 'bg-red-50' : ''}>
                      <td className="py-2.5 text-slate-600">{tx.date}</td>
                      <td className="py-2.5 font-medium text-slate-900">{tx.vendor}</td>
                      <td className="py-2.5 text-slate-600">{tx.category}</td>
                      <td className="py-2.5 text-right font-semibold">${tx.amount.toFixed(2)}</td>
                      <td className="py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isViolation
                            ? 'bg-red-100 text-red-700'
                            : tx.policyStatus
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isViolation ? '❌ Violation' : tx.policyStatus ? '✓ OK' : 'Unchecked'}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500 max-w-xs truncate" title={tx.description}>
                        {tx.description ?? '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="pt-3 font-semibold text-slate-700">Total</td>
                <td className="pt-3 text-right font-bold text-slate-900">${total.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 4: Category Breakdown */}
        <div className="px-8 py-5 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Category Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => typeof val === 'number' ? `$${val.toFixed(2)}` : val} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt], i) => (
                    <tr key={cat}>
                      <td className="py-2 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {cat}
                      </td>
                      <td className="py-2 text-right font-medium">${amt.toFixed(2)}</td>
                      <td className="py-2 text-right text-slate-500">
                        {total > 0 ? ((amt / total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Policy Violations */}
        {violations.length > 0 && (
          <div className="px-8 py-5 border-b border-slate-200 bg-red-50 print:bg-white">
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-4">
              ⚠️ Policy Violations — Action Required
            </h3>
            <div className="space-y-3">
              {violations.map((tx) => (
                <div key={tx.id} className="bg-white border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-900">
                      {tx.date} · {tx.vendor}
                    </span>
                    <span className="font-bold text-red-700">${tx.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Category: {tx.category}</p>
                  {tx.policyStatus!.violations.map((v, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span>•</span><span>{v}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Warnings */}
        {warnings.length > 0 && (
          <div className="px-8 py-5 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-4">
              Warnings & Notes
            </h3>
            <div className="space-y-2">
              {warnings.map((tx) => (
                <div key={tx.id} className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  <span className="font-medium">{tx.vendor}</span>
                  {tx.policyStatus!.warnings.map((w, i) => (
                    <span key={i} className="block text-xs mt-0.5">• {w}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 7: Approval Block */}
        <div className="px-8 py-6 rounded-b-xl">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-5">
            Approval — {reportGuidelines.approverTitle}
          </h3>
          <div className="grid grid-cols-3 gap-8">
            {['Employee Signature', 'Manager Approval', 'Finance Approval'].map((label) => (
              <div key={label} className="border-t-2 border-slate-300 pt-3">
                <p className="text-xs text-slate-500">{label}</p>
                <div className="h-10" />
                <p className="text-xs text-slate-400 border-t border-slate-200 pt-1 mt-1">
                  Signature / Date
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Format guidelines reference */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Report Format Guidelines</h3>
        <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono">
          {reportGuidelines.format.trim()}
        </pre>
      </div>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 text-slate-500 shrink-0">{label}:</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
