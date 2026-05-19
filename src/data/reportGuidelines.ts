import { ReportGuidelines } from '../types';

export const reportGuidelines: ReportGuidelines = {
  title: 'Standard Expense Report',
  sections: [
    '1. Report Header — Employee name, ID, department, manager, reporting period, submission date, report ID',
    '2. Executive Summary — Total amount, number of transactions, number of violations, compliance status',
    '3. Itemized Expenses — Chronological table: Date | Vendor | Category | Amount | Policy Status | Notes',
    '4. Category Breakdown — Subtotal per spending category with visual chart',
    '5. Policy Violations — Detailed list of non-compliant items with policy rule reference and amount over limit',
    '6. Receipts & Documentation — Checklist of attached receipts per transaction',
    '7. Approval Block — Employee signature/date, Manager signature/date, Finance approval signature/date',
  ],
  format: `
FORMATTING STANDARDS
====================
- Currency: USD, two decimal places (e.g., $1,234.56)
- Dates: YYYY-MM-DD (ISO 8601)
- Report ID format: EXP-YYYYMM-[employee-id]-[sequence]
- Violations highlighted in red with policy rule reference
- All amounts rounded to two decimal places
- Category totals must sum to overall total
- Report must be signed before submission
- PDF export is the required submission format
`,
  submissionDeadline: '30 days after the last expense date in the report',
  approverTitle: 'Direct Manager → Finance Department',
};
