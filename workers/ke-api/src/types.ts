import type { Hono } from 'hono';

export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  APP_URL?: string;
  CLERK_DOMAIN?: string;
}

export type AppType = {
  Bindings: Env;
  Variables: { userId: string };
};

export interface UserSyncRequest {
  id: string;
  email: string;
  name?: string | null;
}

export interface CreateFamilyRequest {
  userId: string;
  name?: string;
}

export interface JoinFamilyRequest {
  userId: string;
  inviteCode: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number; // in dollars, will be converted to cents
  category: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  expenseDate?: string; // ISO date string, defaults to today
  paidBy?: string; // defaults to current user
  linkUrl?: string;
  memo?: string;
  childIds?: string[]; // array of child IDs, stored as JSON string
}

export interface Expense {
  id: string;
  family_id: string;
  created_by: string;
  paid_by: string;
  fixed_expense_id: string | null;
  description: string;
  amount_cents: number;
  category: string;
  expense_date: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  status: string;
  questioned_by: string | null;
  questioned_at: string | null;
  question_reason: string | null;
  question_note: string | null;
  resolved_at: string | null;
  resolution_action: string | null;
  satisfied_at: string | null;
  closed_unresolved_at: string | null;
  closed_unresolved_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Family {
  id: string;
  name: string | null;
  parent_a_id: string;
  parent_b_id: string | null;
  parent_a_ratio: number;
  invite_code: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingInvite {
  id: string;
  family_id: string;
  invited_by: string;
  invited_email: string;
  invite_code: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface SendEmailInviteRequest {
  email: string;
}

export interface Payment {
  id: string;
  family_id: string;
  paid_by: string;
  amount_cents: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface BalanceBreakdown {
  total_expenses_cents: number;
  included_expenses_count: number;
  a_share_cents: number;
  b_share_cents: number;
  a_paid_cents: number;
  b_paid_cents: number;
  payments_a_to_b_cents: number;
  payments_b_to_a_cents: number;
  questioned_total_cents: number;
  questioned_count: number;
}

export interface CreatePaymentRequest {
  amount: number; // in dollars, will be converted to cents
  paymentDate?: string; // ISO date string, defaults to today
  notes?: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateChildRequest {
  name: string;
}

export type QuestionReason = 'wrong_amount' | 'not_child_related' | 'duplicate' | 'split_dispute' | 'other';

export interface QuestionExpenseRequest {
  reason: QuestionReason;
  note?: string;
}

export interface ResolveExpenseRequest {
  action: 'keep' | 'edit' | 'personal' | 'delete';
  newAmount?: number; // in dollars, only for 'edit' action
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export interface FixedExpense {
  id: string;
  family_id: string;
  created_by: string;
  description: string;
  amount_cents: number;
  category: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  frequency: RecurringFrequency;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateFixedExpenseRequest {
  description: string;
  amount: number; // in dollars
  category: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  frequency?: RecurringFrequency; // defaults to 'monthly'
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil?: string; // YYYY-MM-DD
  linkUrl?: string;
  memo?: string;
}

export interface UpdateFixedExpenseRequest {
  description?: string;
  amount?: number; // in dollars
  category?: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  frequency?: RecurringFrequency;
  effectiveUntil?: string | null;
  linkUrl?: string | null;
  memo?: string | null;
}

export interface ActivityEvent {
  id: string;
  family_id: string;
  user_id: string;
  event_type: string;
  target_type: string;
  target_id: string;
  before_snapshot: string | null;
  after_snapshot: string | null;
  metadata: string | null;
  created_at: string;
}

export interface ActivityEventWithUser extends ActivityEvent {
  user_email: string;
  user_name: string | null;
}
