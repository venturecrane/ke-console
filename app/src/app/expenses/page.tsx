"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  getExpenses,
  questionExpense,
  resolveExpense,
  satisfyExpense,
  type MeResponse,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type ExpenseFilters,
  type QuestionReason,
  type ResolutionAction,
} from "@/lib/api";

const ITEMS_PER_PAGE = 20;

const CATEGORIES: { value: ExpenseCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "school", label: "School" },
  { value: "medical", label: "Medical" },
  { value: "activities", label: "Activities" },
  { value: "childcare", label: "Childcare" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: ExpenseStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "posted", label: "Posted" },
  { value: "questioned", label: "Questioned" },
  { value: "pending_satisfaction", label: "Pending Satisfaction" },
  { value: "resolved", label: "Resolved" },
  { value: "resolved_creator_decided", label: "Creator Decided" },
  { value: "resolved_personal", label: "Personal" },
  { value: "closed_unresolved", label: "Closed Unresolved" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "custom", label: "Custom Range" },
];

const QUESTION_REASONS: { value: QuestionReason; label: string }[] = [
  { value: "wrong_amount", label: "Wrong Amount" },
  { value: "not_child_related", label: "Not Child Related" },
  { value: "duplicate", label: "Duplicate Entry" },
  { value: "split_dispute", label: "Split Dispute" },
  { value: "other", label: "Other" },
];

const RESOLUTION_ACTIONS: { value: ResolutionAction; label: string; description: string }[] = [
  { value: "keep", label: "Keep As-Is", description: "Keep the expense unchanged" },
  { value: "edit", label: "Edit Amount", description: "Update the amount" },
  { value: "personal", label: "Mark as Personal", description: "Won't count in split" },
  { value: "delete", label: "Delete Expense", description: "Remove this expense" },
];

// Format cents to dollars display
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

// Format category for display
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Get status badge color
function getStatusColor(status: string): string {
  switch (status) {
    case "posted":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "questioned":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "pending_satisfaction":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "resolved":
    case "resolved_creator_decided":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "resolved_personal":
    case "resolved_deleted":
    case "closed_unresolved":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

// Format status for display
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get date range based on preset
function getDateRange(preset: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "this-month": {
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
      return { startDate, endDate };
    }
    case "last-month": {
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      return { startDate, endDate };
    }
    case "last-3-months": {
      const startDate = new Date(year, month - 2, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
      return { startDate, endDate };
    }
    default:
      return {};
  }
}

export default function ExpenseListPage() {
  const { user, isLoaded } = useUser();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "">("");
  const [dateRangePreset, setDateRangePreset] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Question modal state
  const [questionModalExpense, setQuestionModalExpense] = useState<Expense | null>(null);
  const [questionReason, setQuestionReason] = useState<QuestionReason>("wrong_amount");
  const [questionNote, setQuestionNote] = useState("");
  const [isQuestioning, setIsQuestioning] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Resolve modal state
  const [resolveModalExpense, setResolveModalExpense] = useState<Expense | null>(null);
  const [resolveAction, setResolveAction] = useState<ResolutionAction>("keep");
  const [resolveNewAmount, setResolveNewAmount] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Satisfy state
  const [satisfyingExpenseId, setSatisfyingExpenseId] = useState<string | null>(null);

  const fetchExpenses = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        // Build filters
        const filters: ExpenseFilters = {
          limit: ITEMS_PER_PAGE,
          offset,
        };

        if (categoryFilter) {
          filters.category = categoryFilter;
        }
        if (statusFilter) {
          filters.status = statusFilter;
        }

        // Handle date range
        if (dateRangePreset === "custom") {
          if (customStartDate) filters.startDate = customStartDate;
          if (customEndDate) filters.endDate = customEndDate;
        } else if (dateRangePreset !== "all") {
          const { startDate, endDate } = getDateRange(dateRangePreset);
          if (startDate) filters.startDate = startDate;
          if (endDate) filters.endDate = endDate;
        }

        const data = await getExpenses(user.id, meData.family.id, filters);

        if (append) {
          setExpenses((prev) => [...prev, ...data.expenses]);
        } else {
          setExpenses(data.expenses);
        }
        setTotalExpenses(data.pagination.total);
        setCurrentOffset(offset + data.expenses.length);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, meData?.family, categoryFilter, statusFilter, dateRangePreset, customStartDate, customEndDate]
  );

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await getMe(user.id);
        setMeData(data);
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    }

    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  // Fetch expenses when user data or filters change
  useEffect(() => {
    if (meData?.family) {
      fetchExpenses(0, false);
    }
  }, [meData?.family, fetchExpenses]);

  const handleLoadMore = () => {
    fetchExpenses(currentOffset, true);
  };

  const hasMore = currentOffset < totalExpenses;

  // Handle question expense
  async function handleQuestionExpense() {
    if (!user || !questionModalExpense) return;

    setIsQuestioning(true);
    setQuestionError(null);

    try {
      const result = await questionExpense(user.id, questionModalExpense.id, {
        reason: questionReason,
        note: questionNote || undefined,
      });

      // Update the expense in the list
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
      );

      // Close modal and reset state
      setQuestionModalExpense(null);
      setQuestionReason("wrong_amount");
      setQuestionNote("");
    } catch (err) {
      console.error("Failed to question expense:", err);
      setQuestionError(err instanceof Error ? err.message : "Failed to question expense");
    } finally {
      setIsQuestioning(false);
    }
  }

  // Handle resolve expense
  async function handleResolveExpense() {
    if (!user || !resolveModalExpense) return;

    setIsResolving(true);
    setResolveError(null);

    try {
      const request: { action: ResolutionAction; newAmount?: number } = { action: resolveAction };
      if (resolveAction === "edit") {
        const amount = parseFloat(resolveNewAmount);
        if (isNaN(amount) || amount <= 0) {
          setResolveError("Please enter a valid positive amount");
          setIsResolving(false);
          return;
        }
        request.newAmount = amount;
      }

      const result = await resolveExpense(user.id, resolveModalExpense.id, request);

      // Update the expense in the list (or remove if deleted)
      if (resolveAction === "delete") {
        setExpenses((prev) => prev.filter((exp) => exp.id !== result.expense.id));
        setTotalExpenses((prev) => prev - 1);
      } else {
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
        );
      }

      // Close modal and reset state
      setResolveModalExpense(null);
      setResolveAction("keep");
      setResolveNewAmount("");
    } catch (err) {
      console.error("Failed to resolve expense:", err);
      setResolveError(err instanceof Error ? err.message : "Failed to resolve expense");
    } finally {
      setIsResolving(false);
    }
  }

  // Handle satisfy expense
  async function handleSatisfyExpense(expenseId: string) {
    if (!user) return;

    setSatisfyingExpenseId(expenseId);

    try {
      const result = await satisfyExpense(user.id, expenseId);

      // Update the expense in the list
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
      );
    } catch (err) {
      console.error("Failed to satisfy expense:", err);
      // Could show a toast notification here
    } finally {
      setSatisfyingExpenseId(null);
    }
  }

  // Check if user can question an expense
  function canQuestion(expense: Expense): boolean {
    return (
      expense.status === "posted" &&
      expense.created_by !== user?.id
    );
  }

  // Check if user can resolve an expense
  function canResolve(expense: Expense): boolean {
    return (
      expense.status === "questioned" &&
      expense.created_by === user?.id
    );
  }

  // Check if user can satisfy an expense
  function canSatisfy(expense: Expense): boolean {
    return (
      expense.status === "pending_satisfaction" &&
      expense.questioned_by === user?.id
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Expenses
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/expenses/add"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Expense
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Filters */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="category"
                className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="status"
                className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="dateRange"
                className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Date Range
              </label>
              <select
                id="dateRange"
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRangePreset === "custom" && (
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label
                  htmlFor="startDate"
                  className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label
                  htmlFor="endDate"
                  className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              Showing {expenses.length} of {totalExpenses} expense{totalExpenses !== 1 ? "s" : ""}
            </>
          )}
        </div>

        {/* Expense List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No expenses found
            </p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              {categoryFilter || statusFilter
                ? "Try adjusting your filters"
                : "No expenses for this time period"}
            </p>
            {!categoryFilter && !statusFilter && (
              <Link
                href="/expenses/add"
                className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Add First Expense
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {expense.description}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${getStatusColor(expense.status)}`}
                      >
                        {formatStatus(expense.status)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {formatCategory(expense.category)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {expense.paid_by === user?.id ? "You paid" : "Partner paid"}
                      </span>
                    </div>
                    {expense.memo && (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {expense.memo}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-lg font-semibold ${
                        expense.amount_cents < 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {expense.amount_cents < 0 && "("}
                      {formatCurrency(Math.abs(expense.amount_cents))}
                      {expense.amount_cents < 0 && ")"}
                    </p>
                  </div>
                </div>

                {/* Dispute Info for questioned expenses */}
                {expense.status === "questioned" && expense.question_reason && (
                  <div className="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Questioned: {QUESTION_REASONS.find(r => r.value === expense.question_reason)?.label || expense.question_reason}
                    </p>
                    {expense.question_note && (
                      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                        {expense.question_note}
                      </p>
                    )}
                  </div>
                )}

                {/* Pending satisfaction info */}
                {expense.status === "pending_satisfaction" && (
                  <div className="mt-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Creator responded: {expense.resolution_action === "kept" ? "Kept as-is" : expense.resolution_action === "edited" ? "Amount edited" : expense.resolution_action}
                    </p>
                    <p className="mt-1 text-sm text-orange-700 dark:text-orange-400">
                      Waiting for questioner confirmation
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {canQuestion(expense) && (
                    <button
                      onClick={() => setQuestionModalExpense(expense)}
                      className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
                    >
                      Question
                    </button>
                  )}

                  {canResolve(expense) && (
                    <button
                      onClick={() => {
                        setResolveModalExpense(expense);
                        setResolveNewAmount((expense.amount_cents / 100).toString());
                      }}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                    >
                      Respond
                    </button>
                  )}

                  {canSatisfy(expense) && (
                    <button
                      onClick={() => handleSatisfyExpense(expense.id)}
                      disabled={satisfyingExpenseId === expense.id}
                      className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                    >
                      {satisfyingExpenseId === expense.id ? "..." : "Satisfied"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </main>

      {/* Question Modal */}
      {questionModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Question Expense
            </h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Questioning: <strong>{questionModalExpense.description}</strong> ({formatCurrency(questionModalExpense.amount_cents)})
            </p>

            {questionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{questionError}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reason *
              </label>
              <select
                value={questionReason}
                onChange={(e) => setQuestionReason(e.target.value as QuestionReason)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {QUESTION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Note (optional)
              </label>
              <textarea
                value={questionNote}
                onChange={(e) => setQuestionNote(e.target.value)}
                placeholder="Add additional details..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setQuestionModalExpense(null);
                  setQuestionReason("wrong_amount");
                  setQuestionNote("");
                  setQuestionError(null);
                }}
                disabled={isQuestioning}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleQuestionExpense}
                disabled={isQuestioning}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
              >
                {isQuestioning ? "Submitting..." : "Question Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Respond to Question
            </h3>
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              Expense: <strong>{resolveModalExpense.description}</strong> ({formatCurrency(resolveModalExpense.amount_cents)})
            </p>
            {resolveModalExpense.question_reason && (
              <p className="mb-4 text-sm text-yellow-600 dark:text-yellow-400">
                Questioned for: {QUESTION_REASONS.find(r => r.value === resolveModalExpense.question_reason)?.label}
                {resolveModalExpense.question_note && ` - "${resolveModalExpense.question_note}"`}
              </p>
            )}

            {resolveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{resolveError}</p>
              </div>
            )}

            <div className="mb-4 space-y-2">
              {RESOLUTION_ACTIONS.map((action) => (
                <label
                  key={action.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    resolveAction === action.value
                      ? "border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolveAction"
                    value={action.value}
                    checked={resolveAction === action.value}
                    onChange={(e) => setResolveAction(e.target.value as ResolutionAction)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {action.label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {action.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {resolveAction === "edit" && (
              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  New Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={resolveNewAmount}
                  onChange={(e) => setResolveNewAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResolveModalExpense(null);
                  setResolveAction("keep");
                  setResolveNewAmount("");
                  setResolveError(null);
                }}
                disabled={isResolving}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveExpense}
                disabled={isResolving}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  resolveAction === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isResolving ? "Submitting..." : resolveAction === "delete" ? "Delete Expense" : "Submit Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
