import type { Expense, ActivityEvent } from '@/lib/api'

// ---------- Demo Users ----------

export const DEMO_VIEWER_ID = 'demo_alex'
export const DEMO_PARTNER_ID = 'demo_jordan'

export function getDemoUserName(userId: string): string {
  if (userId === DEMO_VIEWER_ID) return 'You'
  if (userId === DEMO_PARTNER_ID) return 'Jordan'
  return 'Unknown'
}

// ---------- Demo Expenses ----------

const DEMO_FAMILY_ID = 'demo_family'

export const DEMO_EXPENSES: Expense[] = [
  {
    id: 'demo_exp_1',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_VIEWER_ID,
    paid_by: DEMO_VIEWER_ID,
    fixed_expense_id: null,
    description: 'School supplies',
    amount_cents: 4599,
    category: 'school',
    expense_date: '2026-01-15',
    child_ids: null,
    link_url: null,
    memo: 'Notebooks, folders, and pens for spring semester',
    status: 'posted',
    questioned_by: null,
    questioned_at: null,
    question_reason: null,
    question_note: null,
    resolved_at: null,
    resolution_action: null,
    satisfied_at: null,
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'demo_exp_2',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_PARTNER_ID,
    paid_by: DEMO_PARTNER_ID,
    fixed_expense_id: null,
    description: 'Soccer registration',
    amount_cents: 35000,
    category: 'activities',
    expense_date: '2026-01-12',
    child_ids: null,
    link_url: null,
    memo: 'Spring season registration fee',
    status: 'posted',
    questioned_by: null,
    questioned_at: null,
    question_reason: null,
    question_note: null,
    resolved_at: null,
    resolution_action: null,
    satisfied_at: null,
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-12T14:30:00Z',
    updated_at: '2026-01-12T14:30:00Z',
    deleted_at: null,
  },
  {
    id: 'demo_exp_3',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_VIEWER_ID,
    paid_by: DEMO_VIEWER_ID,
    fixed_expense_id: null,
    description: 'Doctor visit copay',
    amount_cents: 3500,
    category: 'medical',
    expense_date: '2026-01-18',
    child_ids: null,
    link_url: null,
    memo: null,
    status: 'questioned',
    questioned_by: DEMO_PARTNER_ID,
    questioned_at: '2026-01-19T09:00:00Z',
    question_reason: 'wrong_amount',
    question_note: 'I thought the copay was $25?',
    resolved_at: null,
    resolution_action: null,
    satisfied_at: null,
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-18T16:00:00Z',
    updated_at: '2026-01-19T09:00:00Z',
    deleted_at: null,
  },
  {
    id: 'demo_exp_4',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_VIEWER_ID,
    paid_by: DEMO_VIEWER_ID,
    fixed_expense_id: null,
    description: 'After-school tutoring',
    amount_cents: 12000,
    category: 'school',
    expense_date: '2026-01-20',
    child_ids: null,
    link_url: null,
    memo: '4 sessions in January',
    status: 'pending_satisfaction',
    questioned_by: DEMO_PARTNER_ID,
    questioned_at: '2026-01-21T08:00:00Z',
    question_reason: 'split_dispute',
    question_note: "Should this be split? I didn't agree to tutoring.",
    resolved_at: '2026-01-22T10:00:00Z',
    resolution_action: 'keep',
    satisfied_at: null,
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-20T11:00:00Z',
    updated_at: '2026-01-22T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'demo_exp_5',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_PARTNER_ID,
    paid_by: DEMO_PARTNER_ID,
    fixed_expense_id: null,
    description: 'Winter jacket',
    amount_cents: 8950,
    category: 'other',
    expense_date: '2026-01-08',
    child_ids: null,
    link_url: null,
    memo: 'North Face puffer, size 10',
    status: 'resolved',
    questioned_by: DEMO_VIEWER_ID,
    questioned_at: '2026-01-09T12:00:00Z',
    question_reason: 'wrong_amount',
    question_note: "Wasn't this on sale?",
    resolved_at: '2026-01-10T08:00:00Z',
    resolution_action: 'keep',
    satisfied_at: '2026-01-10T14:00:00Z',
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-08T09:00:00Z',
    updated_at: '2026-01-10T14:00:00Z',
    deleted_at: null,
  },
  {
    id: 'demo_exp_6',
    family_id: DEMO_FAMILY_ID,
    created_by: DEMO_VIEWER_ID,
    paid_by: DEMO_VIEWER_ID,
    fixed_expense_id: null,
    description: 'Math workbook',
    amount_cents: 2499,
    category: 'school',
    expense_date: '2026-01-05',
    child_ids: null,
    link_url: null,
    memo: null,
    status: 'resolved_creator_decided',
    questioned_by: DEMO_PARTNER_ID,
    questioned_at: '2026-01-06T11:00:00Z',
    question_reason: 'not_child_related',
    question_note: 'Is this for the kids or for your class?',
    resolved_at: '2026-01-07T09:00:00Z',
    resolution_action: 'keep',
    satisfied_at: null,
    closed_unresolved_at: null,
    closed_unresolved_by: null,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-07T09:00:00Z',
    deleted_at: null,
  },
]

// ---------- Demo Balance ----------
// Production rules: only posted, resolved, resolved_creator_decided contribute
// Included: School supplies (4599) + Soccer registration (35000) + Winter jacket (8950) + Math workbook (2499) = 51048
// 50/50 split → each share = 25524
// Alex paid: 4599 + 2499 = 7098
// Jordan paid: 35000 + 8950 = 43950
// Alex owes Jordan: 25524 - 7098 = 18426

export const DEMO_BALANCE = {
  total_cents: 51048,
  each_share_cents: 25524,
  alex_paid_cents: 7098,
  jordan_paid_cents: 43950,
  owed_cents: 18426,
  owed_by: DEMO_VIEWER_ID as string,
  owed_to: DEMO_PARTNER_ID as string,
  questioned_total_cents: 3500,
  questioned_count: 1,
}

// ---------- Needs Attention ----------

export const DEMO_ATTENTION_EXPENSES = DEMO_EXPENSES.filter(
  (e) => e.status === 'questioned' || e.status === 'pending_satisfaction'
)

// ---------- Featured Expense (After-school tutoring) ----------

export const DEMO_FEATURED_EXPENSE = DEMO_EXPENSES.find((e) => e.id === 'demo_exp_4')!

// ---------- Featured Timeline (After-school tutoring) ----------

export const DEMO_TIMELINE: ActivityEvent[] = [
  {
    id: 'demo_evt_1',
    family_id: DEMO_FAMILY_ID,
    user_id: DEMO_VIEWER_ID,
    event_type: 'expense.created',
    target_type: 'expense',
    target_id: 'demo_exp_4',
    before_snapshot: null,
    after_snapshot: {
      amount_cents: 12000,
      category: 'school',
      description: 'After-school tutoring',
    },
    metadata: null,
    created_at: '2026-01-20T11:00:00Z',
    user_email: 'alex@example.com',
    user_name: 'Alex',
  },
  {
    id: 'demo_evt_2',
    family_id: DEMO_FAMILY_ID,
    user_id: DEMO_PARTNER_ID,
    event_type: 'expense.questioned',
    target_type: 'expense',
    target_id: 'demo_exp_4',
    before_snapshot: null,
    after_snapshot: {
      question_reason: 'split_dispute',
      question_note: "Should this be split? I didn't agree to tutoring.",
    },
    metadata: {
      reason: 'split_dispute',
      note: "Should this be split? I didn't agree to tutoring.",
    },
    created_at: '2026-01-21T08:00:00Z',
    user_email: 'jordan@example.com',
    user_name: 'Jordan',
  },
  {
    id: 'demo_evt_3',
    family_id: DEMO_FAMILY_ID,
    user_id: DEMO_VIEWER_ID,
    event_type: 'expense.resolved',
    target_type: 'expense',
    target_id: 'demo_exp_4',
    before_snapshot: null,
    after_snapshot: {
      resolution_action: 'keep',
    },
    metadata: {
      action: 'keep',
      note: 'Teacher recommended it.',
    },
    created_at: '2026-01-22T10:00:00Z',
    user_email: 'alex@example.com',
    user_name: 'Alex',
  },
]
