import { Transaction, PolicyCheckResult, SpendingCategory } from '../types';
import { companyPolicy } from '../data/companyPolicy';

export function checkPolicy(transaction: Transaction): PolicyCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (!transaction.category) {
    warnings.push('Category not yet determined — policy check pending.');
    return { compliant: true, violations, warnings };
  }

  const rule = companyPolicy.rules.find(
    (r) => r.category === (transaction.category as SpendingCategory)
  );

  if (!rule) {
    warnings.push('No policy rule found for this category.');
    return { compliant: true, violations, warnings };
  }

  // Amount limit check
  if (transaction.amount > rule.maxAmount) {
    violations.push(
      `Amount $${transaction.amount.toFixed(2)} exceeds the ${rule.maxAmountLabel} limit (over by $${(transaction.amount - rule.maxAmount).toFixed(2)}).`
    );
  }

  // Meals — per-person check
  if (transaction.category === 'Meals & Dining') {
    if (transaction.amount > rule.maxAmount) {
      violations.push(
        `Meal expense must be ≤ $${rule.maxAmount} per person. Ensure the per-person amount is within policy; if multiple attendees, submit with headcount breakdown.`
      );
    }
    if (!transaction.description) {
      warnings.push('Meals require attendee list and business purpose in description.');
    }
  }

  // Receipt requirement — satisfied by an attached image OR by being sourced from a receipt upload
  const hasReceipt = !!transaction.receiptImage || transaction.source === 'receipt';
  if (rule.requiresReceipt && transaction.amount > 25 && !hasReceipt) {
    warnings.push(`Receipt required for expenses over $25. Please attach a receipt.`);
  }

  // Pre-approval
  if (rule.requiresPreApproval) {
    warnings.push(
      `Category "${transaction.category}" requires manager pre-approval.`
    );
  } else if (rule.preApprovalThreshold && transaction.amount >= rule.preApprovalThreshold) {
    warnings.push(
      `Expenses ≥ $${rule.preApprovalThreshold} in this category require pre-approval.`
    );
  }

  // Airfare class check
  if (transaction.category === 'Airfare' && transaction.amount > 600) {
    violations.push(
      'Airfare over $600 requires VP+ pre-approval. Economy class required for flights under 6 hours.'
    );
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
  };
}

export function checkAllTransactions(
  transactions: Transaction[]
): Transaction[] {
  return transactions.map((tx) => ({
    ...tx,
    policyStatus: checkPolicy(tx),
  }));
}
