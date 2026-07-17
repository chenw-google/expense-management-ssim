import { CompanyPolicy } from '../types';

export const companyPolicy: CompanyPolicy = {
  name: 'Travel & Expense Policy',
  effectiveDate: '2026-01-01',
  rules: [
    {
      category: 'Meals & Dining',
      maxAmount: 75,
      maxAmountLabel: '$75 per person per meal',
      notes:
        'Includes all meals. Alcohol is non-reimbursable. Must include list of attendees and business purpose.',
      requiresReceipt: true,
      requiresPreApproval: false,
    },
    {
      category: 'Hotel & Lodging',
      maxAmount: 450,
      maxAmountLabel: '$450 per night',
      notes:
        'Standard room only. Suite upgrades are non-reimbursable unless no standard rooms are available. Taxes and resort fees are reimbursable.',
      requiresReceipt: true,
      requiresPreApproval: false,
    },
    {
      category: 'Rideshare & Taxi',
      maxAmount: 75,
      maxAmountLabel: '$75 per trip',
      notes:
        'Use lowest-cost available option. Rideshare preferred over taxi. Receipts required for all transactions over $100.',
      requiresReceipt: true,
      requiresPreApproval: false,
    },
    {
      category: 'Airfare',
      maxAmount: 600,
      maxAmountLabel: '$600 per one-way ticket',
      notes:
        'Economy/coach class required for flights under 6 hours. Business class requires VP+ approval. Must book through corporate travel portal when available.',
      requiresReceipt: true,
      requiresPreApproval: false,
      preApprovalThreshold: 600,
    },
    {
      category: 'Office Supplies',
      maxAmount: 100,
      maxAmountLabel: '$100 per transaction',
      notes:
        'Office supplies must be work-related. Electronics over $50 require manager approval. Prefer corporate accounts at Staples/Office Depot.',
      requiresReceipt: true,
      requiresPreApproval: false,
      preApprovalThreshold: 100,
    },
    {
      category: 'Entertainment',
      maxAmount: 100,
      maxAmountLabel: '$100 per event',
      notes:
        'Must have clear business purpose. Client entertainment requires manager pre-approval. Must list all attendees.',
      requiresReceipt: true,
      requiresPreApproval: true,
      preApprovalThreshold: 50,
    },
    {
      category: 'Conference & Training',
      maxAmount: 1500,
      maxAmountLabel: '$1,500 per event',
      notes:
        'Includes registration fees, course materials, and venue rental. Requires manager approval prior to booking.',
      requiresReceipt: true,
      requiresPreApproval: true,
    },
    {
      category: 'Parking & Tolls',
      maxAmount: 50,
      maxAmountLabel: '$50 per day',
      notes:
        'Airport and event parking reimbursable. Daily parking at the office is not reimbursable.',
      requiresReceipt: true,
      requiresPreApproval: false,
    },
    {
      category: 'Other',
      maxAmount: 50,
      maxAmountLabel: '$50 per item',
      notes:
        'Miscellaneous expenses require manager approval and clear business justification.',
      requiresReceipt: true,
      requiresPreApproval: true,
    },
  ],
  generalRules: [
    'All expenses must have a valid business purpose.',
    'Receipts are required for all expenses over $100.',
    'Expense reports must be submitted within 30 days of the expense date.',
    'Personal expenses are never reimbursable.',
    'Expenses must be submitted by the individual who incurred the cost.',
    'Splitting expenses to circumvent policy limits is prohibited.',
    'Original itemized receipts are required; credit card statements alone are not sufficient.',
  ],
};

export const categoryLimits: Record<string, number> = Object.fromEntries(
  companyPolicy.rules.map((r) => [r.category, r.maxAmount])
);
