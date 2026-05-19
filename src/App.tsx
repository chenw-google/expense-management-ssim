import { useState, useEffect } from 'react';
import Header, { MODELS } from './components/Header';
import TransactionTable from './components/TransactionTable';
import ExpenseReport from './components/ExpenseReport';
import PolicyPanel from './components/PolicyPanel';
import { Transaction } from './types';
import { mockTransactions } from './data/mockTransactions';

type Tab = 'transactions' | 'policy' | 'report';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => { if (d.model) setSelectedModel(d.model); })
      .catch(() => setBackendError(true));
  }, []);

  const addTransaction = (tx: Transaction) =>
    setTransactions((prev) => [tx, ...prev]);

  const updateTransaction = (id: string, updates: Partial<Transaction>) =>
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'transactions', label: 'Transactions', icon: '💳' },
    { key: 'policy', label: 'Policy', icon: '📋' },
    { key: 'report', label: 'Expense Report', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header selectedModel={selectedModel} onModelChange={setSelectedModel} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {backendError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm">
            ⚠️ Backend not reachable. Run <code className="bg-red-100 px-1 rounded">npm run dev</code> and ensure the server started.
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'transactions' && (
          <TransactionTable
            transactions={transactions}
            onUpdateTransaction={updateTransaction}
            onAddTransaction={addTransaction}
            model={selectedModel}
          />
        )}
        {activeTab === 'policy' && <PolicyPanel />}
        {activeTab === 'report' && <ExpenseReport transactions={transactions} />}
      </main>
    </div>
  );
}
