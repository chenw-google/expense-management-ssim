export type SpendingCategory =
  | 'Meals & Dining'
  | 'Hotel & Lodging'
  | 'Rideshare & Taxi'
  | 'Airfare'
  | 'Office Supplies'
  | 'Entertainment'
  | 'Conference & Training'
  | 'Parking & Tolls'
  | 'Other';

export interface Transaction {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: SpendingCategory | null;
  description?: string;
  source: 'bank' | 'receipt';
  receiptImage?: string;
  location?: string;
  policyStatus?: PolicyCheckResult;
}

export interface PolicyCheckResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

export interface PolicyRule {
  category: SpendingCategory;
  maxAmount: number;
  maxAmountLabel: string;
  notes: string;
  requiresReceipt: boolean;
  requiresPreApproval: boolean;
  preApprovalThreshold?: number;
}

export interface CompanyPolicy {
  name: string;
  effectiveDate: string;
  rules: PolicyRule[];
  generalRules: string[];
}

export interface ReportGuidelines {
  title: string;
  sections: string[];
  format: string;
  submissionDeadline: string;
  approverTitle: string;
}

export interface ExpenseReport {
  reportId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  reportingPeriod: { start: string; end: string };
  submissionDate: string;
  transactions: Transaction[];
  totalAmount: number;
  violatingTransactions: Transaction[];
  categoryBreakdown: Record<string, number>;
}
