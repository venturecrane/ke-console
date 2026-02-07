"use client";

/**
 * useApi() hook — authenticated API client using Clerk JWT tokens.
 *
 * Pattern for page components:
 *   const { user } = useUser();    // for display (name, avatar, etc.)
 *   const api = useApi();           // for authenticated data fetching
 *
 *   const data = await api.getMe(); // no userId param needed
 */

import { useAuth } from "@clerk/nextjs";
import type {
  MeResponse,
  Family,
  FamilyWithParents,
  UpdateFamilyRequest,
  SendEmailInviteResponse,
  PendingInvitesResponse,
  CreateExpenseRequest,
  Expense,
  ExpenseListResponse,
  ExpenseFilters,
  BalanceResponse,
  CreatePaymentRequest,
  Payment,
  PaymentListResponse,
  Child,
  ChildrenListResponse,
  ActivityListResponse,
  ActivityFilters,
  QuestionExpenseRequest,
  ResolveExpenseRequest,
  FixedExpenseListResponse,
  CreateFixedExpenseRequest,
  UpdateFixedExpenseRequest,
  FixedExpense,
  EditExpenseRequest,
  SubscriptionResponse,
  ApiError,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useApi() {
  const { getToken } = useAuth();

  async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  return {
    // User & Family
    getMe: (): Promise<MeResponse> =>
      apiRequest<MeResponse>("/me", { method: "GET" }),

    createFamily: (name?: string): Promise<{ success: boolean; family: Family }> =>
      apiRequest("/families", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),

    getFamily: (familyId: string): Promise<FamilyWithParents> =>
      apiRequest<FamilyWithParents>(`/families/${familyId}`, { method: "GET" }),

    updateFamily: (
      familyId: string,
      updates: UpdateFamilyRequest
    ): Promise<{ success: boolean; family: Family }> =>
      apiRequest(`/families/${familyId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),

    generateInviteCode: (
      familyId: string
    ): Promise<{ success: boolean; inviteCode: string; expiresAt: string }> =>
      apiRequest(`/families/${familyId}/invite`, { method: "POST" }),

    // Email Invites
    sendEmailInvite: (
      familyId: string,
      email: string
    ): Promise<SendEmailInviteResponse> =>
      apiRequest(`/families/${familyId}/invite/email`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    getPendingInvites: (familyId: string): Promise<PendingInvitesResponse> =>
      apiRequest<PendingInvitesResponse>(`/families/${familyId}/invites`, {
        method: "GET",
      }),

    cancelInvite: (
      familyId: string,
      inviteId: string
    ): Promise<{ success: boolean }> =>
      apiRequest(`/families/${familyId}/invites/${inviteId}`, {
        method: "DELETE",
      }),

    joinFamily: (inviteCode: string): Promise<{ success: boolean; family: Family }> =>
      apiRequest("/families/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),

    // Expenses
    createExpense: (
      familyId: string,
      expense: CreateExpenseRequest
    ): Promise<{ success: boolean; expense: Expense }> =>
      apiRequest(`/families/${familyId}/expenses`, {
        method: "POST",
        body: JSON.stringify(expense),
      }),

    getExpenses: (
      familyId: string,
      filters?: ExpenseFilters
    ): Promise<ExpenseListResponse> => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.category) params.set("category", filters.category);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.limit) params.set("limit", filters.limit.toString());
      if (filters?.offset) params.set("offset", filters.offset.toString());
      const qs = params.toString();
      return apiRequest<ExpenseListResponse>(
        `/families/${familyId}/expenses${qs ? `?${qs}` : ""}`,
        { method: "GET" }
      );
    },

    getExpense: (expenseId: string): Promise<{ expense: Expense }> =>
      apiRequest<{ expense: Expense }>(`/expenses/${expenseId}`, {
        method: "GET",
      }),

    // Disputes
    questionExpense: (
      expenseId: string,
      request: QuestionExpenseRequest
    ): Promise<{ success: boolean; expense: Expense }> =>
      apiRequest(`/expenses/${expenseId}/question`, {
        method: "POST",
        body: JSON.stringify(request),
      }),

    resolveExpense: (
      expenseId: string,
      request: ResolveExpenseRequest
    ): Promise<{ success: boolean; expense: Expense }> =>
      apiRequest(`/expenses/${expenseId}/resolve`, {
        method: "POST",
        body: JSON.stringify(request),
      }),

    satisfyExpense: (
      expenseId: string
    ): Promise<{ success: boolean; expense: Expense }> =>
      apiRequest(`/expenses/${expenseId}/satisfy`, { method: "POST" }),

    // Balance
    getBalance: (familyId: string): Promise<BalanceResponse> =>
      apiRequest<BalanceResponse>(`/families/${familyId}/balance`, {
        method: "GET",
      }),

    // Payments
    createPayment: (
      familyId: string,
      payment: CreatePaymentRequest
    ): Promise<{ success: boolean; payment: Payment }> =>
      apiRequest(`/families/${familyId}/payments`, {
        method: "POST",
        body: JSON.stringify(payment),
      }),

    getPayments: (
      familyId: string,
      limit?: number,
      offset?: number
    ): Promise<PaymentListResponse> => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", limit.toString());
      if (offset) params.set("offset", offset.toString());
      const qs = params.toString();
      return apiRequest<PaymentListResponse>(
        `/families/${familyId}/payments${qs ? `?${qs}` : ""}`,
        { method: "GET" }
      );
    },

    // Children
    getChildren: (
      familyId: string,
      includeDeleted?: boolean
    ): Promise<ChildrenListResponse> => {
      const params = new URLSearchParams();
      if (includeDeleted) params.set("include_deleted", "true");
      const qs = params.toString();
      return apiRequest<ChildrenListResponse>(
        `/families/${familyId}/children${qs ? `?${qs}` : ""}`,
        { method: "GET" }
      );
    },

    createChild: (familyId: string, name: string): Promise<Child> =>
      apiRequest<Child>(`/families/${familyId}/children`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),

    deleteChild: (
      familyId: string,
      childId: string
    ): Promise<{ id: string; deleted_at: string }> =>
      apiRequest<{ id: string; deleted_at: string }>(
        `/families/${familyId}/children/${childId}`,
        { method: "DELETE" }
      ),

    // Activity
    getActivity: (
      familyId: string,
      filters?: ActivityFilters
    ): Promise<ActivityListResponse> => {
      const params = new URLSearchParams();
      if (filters?.type && filters.type !== "all")
        params.set("type", filters.type);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.limit) params.set("limit", filters.limit.toString());
      if (filters?.offset) params.set("offset", filters.offset.toString());
      if (filters?.expenseId) params.set("expense_id", filters.expenseId);
      const qs = params.toString();
      return apiRequest<ActivityListResponse>(
        `/families/${familyId}/activity${qs ? `?${qs}` : ""}`,
        { method: "GET" }
      );
    },

    // Fixed Expenses
    getFixedExpenses: (
      familyId: string,
      includeEnded?: boolean
    ): Promise<FixedExpenseListResponse> => {
      const params = new URLSearchParams();
      if (includeEnded) params.set("includeEnded", "true");
      const qs = params.toString();
      return apiRequest<FixedExpenseListResponse>(
        `/families/${familyId}/fixed-expenses${qs ? `?${qs}` : ""}`,
        { method: "GET" }
      );
    },

    createFixedExpense: (
      familyId: string,
      request: CreateFixedExpenseRequest
    ): Promise<{ success: boolean; fixedExpense: FixedExpense }> =>
      apiRequest(`/families/${familyId}/fixed-expenses`, {
        method: "POST",
        body: JSON.stringify(request),
      }),

    updateFixedExpense: (
      familyId: string,
      fixedExpenseId: string,
      request: UpdateFixedExpenseRequest
    ): Promise<{ success: boolean; fixedExpense: FixedExpense }> =>
      apiRequest(`/families/${familyId}/fixed-expenses/${fixedExpenseId}`, {
        method: "PATCH",
        body: JSON.stringify(request),
      }),

    endFixedExpense: (
      familyId: string,
      fixedExpenseId: string
    ): Promise<{ success: boolean; fixedExpense: FixedExpense }> =>
      apiRequest(`/families/${familyId}/fixed-expenses/${fixedExpenseId}`, {
        method: "DELETE",
      }),

    // Edit / Delete Expense (#90)
    editExpense: (
      expenseId: string,
      updates: EditExpenseRequest
    ): Promise<{ success: boolean; expense: Expense }> =>
      apiRequest(`/expenses/${expenseId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),

    deleteExpense: (
      expenseId: string
    ): Promise<{ success: boolean; id: string }> =>
      apiRequest(`/expenses/${expenseId}`, { method: "DELETE" }),

    // Subscription / Billing (#92)
    getSubscription: (familyId: string): Promise<SubscriptionResponse> =>
      apiRequest<SubscriptionResponse>(`/families/${familyId}/subscription`, {
        method: "GET",
      }),

    createCheckoutSession: (
      familyId: string,
      returnUrl: string
    ): Promise<{ checkoutUrl: string; sessionId: string }> =>
      apiRequest(`/families/${familyId}/subscription/checkout`, {
        method: "POST",
        body: JSON.stringify({ returnUrl }),
      }),

    cancelSubscription: (
      familyId: string
    ): Promise<{ success: boolean; message: string }> =>
      apiRequest(`/families/${familyId}/subscription`, { method: "DELETE" }),
  };
}
