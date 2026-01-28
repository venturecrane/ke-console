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
  { value: "duplicate", label: "Duplicate" },
  { value: "split_dispute", label: "Split Dispute" },
  { value: "other", label: "Other" },
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
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Question Modal State
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [questionReason, setQuestionReason] = useState<QuestionReason>("wrong_amount");
  const [questionNote, setQuestionNote] = useState("");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Resolve Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState<ResolutionAction>("keep");
  const [resolveNewAmount, setResolveNewAmount] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Satisfy action state
  const [isSubmittingSatisfy, setIsSubmittingSatisfy] = useState<string | null>(null);

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

  // Open Question Modal
  const openQuestionModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setQuestionReason("wrong_amount");
    setQuestionNote("");
    setQuestionModalOpen(true);
  };

  // Submit Question
  const handleSubmitQuestion = async () => {
    if (!user || !selectedExpense) return;

    setIsSubmittingQuestion(true);
    try {
      await questionExpense(user.id, selectedExpense.id, {
        reason: questionReason,
        note: questionNote || undefined,
      });
      setQuestionModalOpen(false);
      // Refresh expenses
      fetchExpenses(0, false);
    } catch (error) {
      console.error("Failed to question expense:", error);
      alert("Failed to question expense. Please try again.");
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Open Resolve Modal
  const openResolveModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setResolveAction("keep");
    setResolveNewAmount((expense.amount_cents / 100).toString());
    setResolveModalOpen(true);
  };

  // Submit Resolve
  const handleSubmitResolve = async () => {
    if (!user || !selectedExpense) return;

    setIsSubmittingResolve(true);
    try {
      await resolveExpense(user.id, selectedExpense.id, {
        action: resolveAction,
        newAmount: resolveAction === "edit" ? parseFloat(resolveNewAmount) : undefined,
      });
      setResolveModalOpen(false);
      // Refresh expenses
      fetchExpenses(0, false);
    } catch (error) {
      console.error("Failed to resolve expense:", error);
      alert("Failed to resolve expense. Please try again.");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // Handle Satisfy
  const handleSatisfy = async (expense: Expense) => {
    if (!user) return;

    setIsSubmittingSatisfy(expense.id);
    try {
      await satisfyExpense(user.id, expense.id);
      // Refresh expenses
      fetchExpenses(0, false);
    } catch (error) {
      console.error("Failed to satisfy expense:", error);
      alert("Failed to mark as satisfied. Please try again.");
    } finally {
      setIsSubmittingSatisfy(null);
    }
  };

  // Check if user can question this expense
  const canQuestion = (expense: Expense) => {
    return (
      expense.status === "posted" &&
      expense.created_by !== user?.id
    );
  };

  // Check if user can resolve this expense
  const canResolve = (expense: Expense) => {
    return (
      expense.status === "questioned" &&
      expense.created_by === user?.id
    );
  };

  // Check if user can satisfy this expense
  const canSatisfy = (expense: Expense) => {
    return (
      expense.status === "pending_satisfaction" &&
      expense.questioned_by === user?.id
    );
  };

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
              {categoryFilter || statusFilter || dateRangePreset !== "all"
                ? "Try adjusting your filters"
                : "Add your first expense to get started"}
            </p>
            {!categoryFilter && !statusFilter && dateRangePreset === "all" && (
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
                className={`rounded-lg border bg-white p-4 dark:bg-zinc-950 ${
                  expense.status === "questioned" || expense.status === "pending_satisfaction"
                    ? "border-yellow-300 dark:border-yellow-700"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
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
                      {expense.fixed_expense_id && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Fixed
                        </span>
                      )}
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
                    {/* Show question info if questioned */}
                    {expense.question_reason && (
                      <div className="mt-2 rounded bg-yellow-50 p-2 text-sm dark:bg-yellow-900/20">
                        <p className="font-medium text-yellow-800 dark:text-yellow-300">
                          Questioned: {formatStatus(expense.question_reason)}
                        </p>
                        {expense.question_note && (
                          <p className="text-yellow-700 dark:text-yellow-400">{expense.question_note}</p>
                        )}
                      </div>
                    )}
                    {/* Show resolution info if resolved */}
                    {expense.resolution_action && expense.status === "pending_satisfaction" && (
                      <div className="mt-2 rounded bg-orange-50 p-2 text-sm dark:bg-orange-900/20">
                        <p className="font-medium text-orange-800 dark:text-orange-300">
                          Resolution: {formatStatus(expense.resolution_action)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
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
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {canQuestion(expense) && (
                        <button
                          onClick={() => openQuestionModal(expense)}
                          className="rounded border border-yellow-400 px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                        >
                          Question
                        </button>
                      )}
                      {canResolve(expense) && (
                        <button
                          onClick={() => openResolveModal(expense)}
                          className="rounded border border-blue-400 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          Respond
                        </button>
                      )}
                      {canSatisfy(expense) && (
                        <button
                          onClick={() => handleSatisfy(expense)}
                          disabled={isSubmittingSatisfy === expense.id}
                          className="rounded border border-green-400 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                          {isSubmittingSatisfy === expense.id ? "..." : "Satisfied"}
                        </button>
                      )}
                    </div>
                  </div>
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
      {questionModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Question Expense
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {selectedExpense.description} - {formatCurrency(selectedExpense.amount_cents)}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reason *
              </label>
              <select
                value={questionReason}
                onChange={(e) => setQuestionReason(e.target.value as QuestionReason)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {QUESTION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Note (optional)
              </label>
              <textarea
                value={questionNote}
                onChange={(e) => setQuestionNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Add any additional details..."
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setQuestionModalOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuestion}
                disabled={isSubmittingQuestion}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                {isSubmittingQuestion ? "Submitting..." : "Question Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Respond to Question
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {selectedExpense.description} - {formatCurrency(selectedExpense.amount_cents)}
            </p>
            {selectedExpense.question_reason && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                Reason: {formatStatus(selectedExpense.question_reason)}
                {selectedExpense.question_note && ` - "${selectedExpense.question_note}"`}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="action"
                  value="keep"
                  checked={resolveAction === "keep"}
                  onChange={() => setResolveAction("keep")}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Keep as-is</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="action"
                  value="edit"
                  checked={resolveAction === "edit"}
                  onChange={() => setResolveAction("edit")}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Edit amount</span>
              </label>
              {resolveAction === "edit" && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    New Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={resolveNewAmount}
                    onChange={(e) => setResolveNewAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="action"
                  value="personal"
                  checked={resolveAction === "personal"}
                  onChange={() => setResolveAction("personal")}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Mark as personal (exclude from split)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="action"
                  value="delete"
                  checked={resolveAction === "delete"}
                  onChange={() => setResolveAction("delete")}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-red-600 dark:text-red-400">Delete expense</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setResolveModalOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResolve}
                disabled={isSubmittingResolve || (resolveAction === "edit" && !resolveNewAmount)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmittingResolve ? "Submitting..." : "Submit Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
