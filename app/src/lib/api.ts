const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
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

export interface MeResponse {
  user: User;
  family: Family | null;
  role: "parent_a" | "parent_b" | null;
}

export interface FamilyWithParents {
  family: Family;
  parentA: User;
  parentB: User | null;
}

export type ExpenseCategory = "school" | "medical" | "activities" | "childcare" | "other";

export type ExpenseStatus =
  | "posted"
  | "questioned"
  | "pending_satisfaction"
  | "resolved"
  | "resolved_creator_decided"
  | "resolved_personal"
  | "resolved_deleted"
  | "closed_unresolved";

export interface Expense {
  id: string;
  family_id: string;
  created_by: string;
  paid_by: string;
  fixed_expense_id: string | null;
  description: string;
  amount_cents: number;
  category: ExpenseCategory;
  expense_date: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  status: ExpenseStatus;
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

export interface CreateExpenseRequest {
  description: string;
  amount: number; // in dollars
  category: ExpenseCategory;
  expenseDate?: string;
  paidBy?: string;
  linkUrl?: string;
  memo?: string;
  childIds?: string[];
}

export interface ExpenseListResponse {
  expenses: Expense[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ChildrenListResponse {
  children: Child[];
  count: number;
}

export interface ApiError {
  error: string;
  details?: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  userId?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(userId ? { "X-User-Id": userId } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || "Request failed");
  }

  return data as T;
}

export async function getMe(userId: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/me", { method: "GET" }, userId);
}

export async function createFamily(
  userId: string,
  name?: string
): Promise<{ success: boolean; family: Family }> {
  return apiRequest("/families", {
    method: "POST",
    body: JSON.stringify({ userId, name }),
  });
}

export async function getFamily(
  userId: string,
  familyId: string
): Promise<FamilyWithParents> {
  return apiRequest<FamilyWithParents>(
    `/families/${familyId}`,
    { method: "GET" },
    userId
  );
}

export interface UpdateFamilyRequest {
  parentARatio?: number;
  name?: string;
}

export async function updateFamily(
  userId: string,
  familyId: string,
  updates: UpdateFamilyRequest
): Promise<{ success: boolean; family: Family }> {
  return apiRequest(
    `/families/${familyId}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
    userId
  );
}

export async function generateInviteCode(
  userId: string,
  familyId: string
): Promise<{ success: boolean; inviteCode: string; expiresAt: string }> {
  return apiRequest(
    `/families/${familyId}/invite`,
    { method: "POST" },
    userId
  );
}

// ============================================
// EMAIL INVITE API
// ============================================

export interface PendingInvite {
  id: string;
  family_id: string;
  invited_by: string;
  invited_email: string;
  invite_code: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  is_expired?: boolean;
}

export interface SendEmailInviteResponse {
  success: boolean;
  inviteCode: string;
  inviteLink: string;
  expiresAt: string;
  emailSent: boolean;
}

export interface PendingInvitesResponse {
  invites: PendingInvite[];
}

export async function sendEmailInvite(
  userId: string,
  familyId: string,
  email: string
): Promise<SendEmailInviteResponse> {
  return apiRequest(
    `/families/${familyId}/invite/email`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    userId
  );
}

export async function getPendingInvites(
  userId: string,
  familyId: string
): Promise<PendingInvitesResponse> {
  return apiRequest<PendingInvitesResponse>(
    `/families/${familyId}/invites`,
    { method: "GET" },
    userId
  );
}

export async function cancelInvite(
  userId: string,
  familyId: string,
  inviteId: string
): Promise<{ success: boolean }> {
  return apiRequest(
    `/families/${familyId}/invites/${inviteId}`,
    { method: "DELETE" },
    userId
  );
}

export async function joinFamily(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; family: Family }> {
  return apiRequest("/families/join", {
    method: "POST",
    body: JSON.stringify({ userId, inviteCode }),
  });
}

export async function createExpense(
  userId: string,
  familyId: string,
  expense: CreateExpenseRequest
): Promise<{ success: boolean; expense: Expense }> {
  return apiRequest(
    `/families/${familyId}/expenses`,
    {
      method: "POST",
      body: JSON.stringify(expense),
    },
    userId
  );
}

export async function getExpenses(
  userId: string,
  familyId: string,
  filters?: ExpenseFilters
): Promise<ExpenseListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const queryString = params.toString();
  const path = `/families/${familyId}/expenses${queryString ? `?${queryString}` : ""}`;

  return apiRequest<ExpenseListResponse>(path, { method: "GET" }, userId);
}

// ============================================
// BALANCE API
// ============================================

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

export interface BalancePeriod {
  start: string;
  end: string;
  label: string;
}

export interface CurrentPeriodBreakdown {
  a_expenses_cents: number;
  a_payments_cents: number;
  b_expenses_cents: number;
  b_payments_cents: number;
}

export interface PriorBalance {
  balance_cents: number;
  payer_id: string | null;
  payee_id: string | null;
}

export interface BalanceResponse {
  balance_cents: number;
  payer_id: string | null;
  payee_id: string | null;
  parent_a_id: string;
  parent_b_id: string | null;
  breakdown: BalanceBreakdown;
  period: BalancePeriod;
  current_period: CurrentPeriodBreakdown;
  prior_balance: PriorBalance;
}

export async function getBalance(
  userId: string,
  familyId: string
): Promise<BalanceResponse> {
  return apiRequest<BalanceResponse>(
    `/families/${familyId}/balance`,
    { method: "GET" },
    userId
  );
}

// ============================================
// PAYMENTS API
// ============================================

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

export interface CreatePaymentRequest {
  amount: number; // in dollars
  paymentDate?: string;
  notes?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export async function createPayment(
  userId: string,
  familyId: string,
  payment: CreatePaymentRequest
): Promise<{ success: boolean; payment: Payment }> {
  return apiRequest(
    `/families/${familyId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(payment),
    },
    userId
  );
}

export async function getPayments(
  userId: string,
  familyId: string,
  limit?: number,
  offset?: number
): Promise<PaymentListResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (offset) params.set("offset", offset.toString());

  const queryString = params.toString();
  const path = `/families/${familyId}/payments${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaymentListResponse>(path, { method: "GET" }, userId);
}

// ============================================
// CHILDREN API
// ============================================

export async function getChildren(
  userId: string,
  familyId: string,
  includeDeleted?: boolean
): Promise<ChildrenListResponse> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("include_deleted", "true");

  const queryString = params.toString();
  const path = `/families/${familyId}/children${queryString ? `?${queryString}` : ""}`;

  return apiRequest<ChildrenListResponse>(path, { method: "GET" }, userId);
}

export async function createChild(
  userId: string,
  familyId: string,
  name: string
): Promise<Child> {
  return apiRequest<Child>(
    `/families/${familyId}/children`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    userId
  );
}

export async function deleteChild(
  userId: string,
  familyId: string,
  childId: string
): Promise<{ id: string; deleted_at: string }> {
  return apiRequest<{ id: string; deleted_at: string }>(
    `/families/${familyId}/children/${childId}`,
    { method: "DELETE" },
    userId
  );
}

// ============================================
// ACTIVITY API
// ============================================

export type ActivityEventType =
  | "expense.created"
  | "expense.edited"
  | "expense.questioned"
  | "expense.resolved"
  | "expense.satisfied"
  | "expense.generated"
  | "payment.created"
  | "child.created"
  | "child.deleted"
  | "fixed_expense.created"
  | "fixed_expense.updated"
  | "fixed_expense.ended"
  | "family.ratio_updated";

export interface ActivityEvent {
  id: string;
  family_id: string;
  user_id: string;
  event_type: ActivityEventType;
  target_type: string;
  target_id: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export interface ActivityListResponse {
  events: ActivityEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export type ActivityTypeFilter =
  | "all"
  | "expenses"
  | "payments"
  | "fixed_expenses"
  | "disputes"
  | "children";

export interface ActivityFilters {
  type?: ActivityTypeFilter;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  expenseId?: string;
}

export async function getActivity(
  userId: string,
  familyId: string,
  filters?: ActivityFilters
): Promise<ActivityListResponse> {
  const params = new URLSearchParams();
  if (filters?.type && filters.type !== "all") params.set("type", filters.type);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());
  if (filters?.expenseId) params.set("expense_id", filters.expenseId);

  const queryString = params.toString();
  const path = `/families/${familyId}/activity${queryString ? `?${queryString}` : ""}`;

  return apiRequest<ActivityListResponse>(path, { method: "GET" }, userId);
}

// ============================================
// DISPUTE API
// ============================================

export type QuestionReason =
  | "wrong_amount"
  | "not_child_related"
  | "duplicate"
  | "split_dispute"
  | "other";

export type ResolutionAction = "keep" | "edit" | "personal" | "delete";

export interface QuestionExpenseRequest {
  reason: QuestionReason;
  note?: string;
}

export interface ResolveExpenseRequest {
  action: ResolutionAction;
  newAmount?: number; // in dollars, only for 'edit' action
}

export async function getExpense(
  userId: string,
  expenseId: string
): Promise<{ expense: Expense }> {
  return apiRequest<{ expense: Expense }>(
    `/expenses/${expenseId}`,
    { method: "GET" },
    userId
  );
}

export async function questionExpense(
  userId: string,
  expenseId: string,
  request: QuestionExpenseRequest
): Promise<{ success: boolean; expense: Expense }> {
  return apiRequest(
    `/expenses/${expenseId}/question`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    userId
  );
}

export async function resolveExpense(
  userId: string,
  expenseId: string,
  request: ResolveExpenseRequest
): Promise<{ success: boolean; expense: Expense }> {
  return apiRequest(
    `/expenses/${expenseId}/resolve`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    userId
  );
}

export async function satisfyExpense(
  userId: string,
  expenseId: string
): Promise<{ success: boolean; expense: Expense }> {
  return apiRequest(
    `/expenses/${expenseId}/satisfy`,
    { method: "POST" },
    userId
  );
}

// ============================================
// FIXED EXPENSES API
// ============================================

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export interface FixedExpense {
  id: string;
  family_id: string;
  created_by: string;
  description: string;
  amount_cents: number;
  category: ExpenseCategory;
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
  category: ExpenseCategory;
  frequency?: RecurringFrequency; // defaults to 'monthly'
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil?: string; // YYYY-MM-DD
  linkUrl?: string;
  memo?: string;
}

export interface UpdateFixedExpenseRequest {
  description?: string;
  amount?: number; // in dollars
  category?: ExpenseCategory;
  frequency?: RecurringFrequency;
  effectiveUntil?: string | null;
  linkUrl?: string | null;
  memo?: string | null;
}

export interface FixedExpenseTier {
  current: number;
  limit: number; // -1 means unlimited
  canAdd: boolean;
}

export interface FixedExpenseListResponse {
  fixedExpenses: FixedExpense[];
  count: number;
  tier: FixedExpenseTier;
}

export async function getFixedExpenses(
  userId: string,
  familyId: string,
  includeEnded?: boolean
): Promise<FixedExpenseListResponse> {
  const params = new URLSearchParams();
  if (includeEnded) params.set("includeEnded", "true");

  const queryString = params.toString();
  const path = `/families/${familyId}/fixed-expenses${queryString ? `?${queryString}` : ""}`;

  return apiRequest<FixedExpenseListResponse>(path, { method: "GET" }, userId);
}

export async function createFixedExpense(
  userId: string,
  familyId: string,
  request: CreateFixedExpenseRequest
): Promise<{ success: boolean; fixedExpense: FixedExpense }> {
  return apiRequest(
    `/families/${familyId}/fixed-expenses`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    userId
  );
}

export async function updateFixedExpense(
  userId: string,
  familyId: string,
  fixedExpenseId: string,
  request: UpdateFixedExpenseRequest
): Promise<{ success: boolean; fixedExpense: FixedExpense }> {
  return apiRequest(
    `/families/${familyId}/fixed-expenses/${fixedExpenseId}`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
    userId
  );
}

export async function endFixedExpense(
  userId: string,
  familyId: string,
  fixedExpenseId: string
): Promise<{ success: boolean; fixedExpense: FixedExpense }> {
  return apiRequest(
    `/families/${familyId}/fixed-expenses/${fixedExpenseId}`,
    { method: "DELETE" },
    userId
  );
}
