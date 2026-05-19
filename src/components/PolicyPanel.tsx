import { companyPolicy } from '../data/companyPolicy';

export default function PolicyPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">{companyPolicy.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Effective {companyPolicy.effectiveDate}
            </p>
          </div>
          <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">Active Policy</span>
        </div>

        {/* Spending limits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {companyPolicy.rules.map((rule) => (
            <div
              key={rule.category}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-800">{rule.category}</span>
                <span className="text-sm font-bold text-blue-700">{rule.maxAmountLabel}</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{rule.notes}</p>
              <div className="flex flex-wrap gap-1.5">
                {rule.requiresReceipt && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Receipt required</span>
                )}
                {rule.requiresPreApproval && (
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Pre-approval required</span>
                )}
                {rule.preApprovalThreshold && !rule.requiresPreApproval && (
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    Pre-approval if ≥${rule.preApprovalThreshold}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* General rules */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">General Rules</h3>
          <ul className="space-y-2">
            {companyPolicy.generalRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
