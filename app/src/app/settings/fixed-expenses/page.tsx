"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  endFixedExpense,
  type MeResponse,
  type FixedExpense,
  type ExpenseCategory,
  type CreateFixedExpenseRequest,
} from "@/lib/api";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "school", label: "School" },
  { value: "medical", label: "Medical" },
  { value: "activities", label: "Activities" },
  { value: "childcare", label: "Childcare" },
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

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function FixedExpensesSettingsPage() {
  const { user, isLoaded } = useUser();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tier info
  const [tierCurrent, setTierCurrent] = useState(0);
  const [tierLimit, setTierLimit] = useState(2);
  const [canAdd, setCanAdd] = useState(true);

  // Show ended toggle
  const [showEnded, setShowEnded] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [effectiveFrom, setEffectiveFrom] = useState(getTodayDate());
  const [linkUrl, setLinkUrl] = useState("");
  const [memo, setMemo] = useState("");

  // Edit modal
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Edit form fields
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("other");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editMemo, setEditMemo] = useState("");

  // End confirmation
  const [endingExpenseId, setEndingExpenseId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const fetchFixedExpenses = useCallback(async () => {
    if (!user || !meData?.family) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getFixedExpenses(user.id, meData.family.id, showEnded);
      setFixedExpenses(data.fixedExpenses);
      setTierCurrent(data.tier.current);
      setTierLimit(data.tier.limit);
      setCanAdd(data.tier.canAdd);
    } catch (err) {
      console.error("Failed to fetch fixed expenses:", err);
      setError("Failed to load fixed expenses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, meData?.family, showEnded]);

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await getMe(user.id);
        setMeData(data);
      } catch (err) {
        console.error("Failed to load user data:", err);
        setError("Failed to load user data. Please try again.");
      }
    }

    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  // Fetch fixed expenses when user data is loaded
  useEffect(() => {
    if (meData?.family) {
      fetchFixedExpenses();
    }
  }, [meData?.family, fetchFixedExpenses]);

  const resetAddForm = () => {
    setDescription("");
    setAmount("");
    setCategory("other");
    setEffectiveFrom(getTodayDate());
    setLinkUrl("");
    setMemo("");
    setAddError(null);
  };

  async function handleAddFixedExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setAddError("Description is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAddError("Valid amount is required");
      return;
    }

    if (!effectiveFrom) {
      setAddError("Effective from date is required");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const request: CreateFixedExpenseRequest = {
        description: trimmedDescription,
        amount: amountNum,
        category,
        effectiveFrom,
        linkUrl: linkUrl.trim() || undefined,
        memo: memo.trim() || undefined,
      };

      await createFixedExpense(user.id, meData.family.id, request);
      resetAddForm();
      setShowAddForm(false);
      fetchFixedExpenses();
    } catch (err) {
      console.error("Failed to create fixed expense:", err);
      setAddError(err instanceof Error ? err.message : "Failed to create fixed expense");
    } finally {
      setIsAdding(false);
    }
  }

  const openEditModal = (expense: FixedExpense) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditAmount((expense.amount_cents / 100).toString());
    setEditCategory(expense.category as ExpenseCategory);
    setEditLinkUrl(expense.link_url || "");
    setEditMemo(expense.memo || "");
    setEditError(null);
  };

  async function handleUpdateFixedExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family || !editingExpense) return;

    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      setEditError("Description is required");
      return;
    }

    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditError("Valid amount is required");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      await updateFixedExpense(user.id, meData.family.id, editingExpense.id, {
        description: trimmedDescription,
        amount: amountNum,
        category: editCategory,
        linkUrl: editLinkUrl.trim() || null,
        memo: editMemo.trim() || null,
      });
      setEditingExpense(null);
      fetchFixedExpenses();
    } catch (err) {
      console.error("Failed to update fixed expense:", err);
      setEditError(err instanceof Error ? err.message : "Failed to update fixed expense");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleEndFixedExpense(expenseId: string) {
    if (!user || !meData?.family) return;

    setIsEnding(true);

    try {
      await endFixedExpense(user.id, meData.family.id, expenseId);
      setEndingExpenseId(null);
      fetchFixedExpenses();
    } catch (err) {
      console.error("Failed to end fixed expense:", err);
      setError(err instanceof Error ? err.message : "Failed to end fixed expense");
    } finally {
      setIsEnding(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!meData?.family) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Fixed Expenses
              </h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-zinc-600 dark:text-zinc-400">
              You need to create or join a family first.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </main>
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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Fixed Expenses
            </h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tier Info */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {tierLimit === -1 ? "Unlimited Fixed Expenses (Pro)" : `${tierCurrent} / ${tierLimit} Fixed Expenses`}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {tierLimit === -1
                  ? "You can create unlimited fixed expenses."
                  : canAdd
                  ? `You can add ${tierLimit - tierCurrent} more fixed expense${tierLimit - tierCurrent !== 1 ? "s" : ""}.`
                  : "Upgrade to Pro for unlimited fixed expenses."}
              </p>
            </div>
            {tierLimit !== -1 && !canAdd && (
              <Link
                href="/settings/subscription"
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Add Button / Form */}
        {!showAddForm && (
          <div className="mb-6">
            <button
              onClick={() => {
                resetAddForm();
                setShowAddForm(true);
              }}
              disabled={!canAdd}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Fixed Expense
            </button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Add Fixed Expense
            </h2>
            <form onSubmit={handleAddFixedExpense} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={200}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Monthly Tuition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Memo (optional)
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {addError && (
                <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isAdding ? "Adding..." : "Add Fixed Expense"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Show Ended Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showEnded"
            checked={showEnded}
            onChange={(e) => setShowEnded(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          <label htmlFor="showEnded" className="text-sm text-zinc-600 dark:text-zinc-400">
            Show ended fixed expenses
          </label>
        </div>

        {/* Fixed Expenses List */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Fixed Expenses ({fixedExpenses.length})
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              These expenses will automatically generate on the 1st of each month.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-zinc-500">Loading fixed expenses...</p>
            </div>
          ) : fixedExpenses.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">No fixed expenses yet</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add recurring expenses like rent or tuition that auto-populate monthly.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fixedExpenses.map((expense) => {
                const isEnded = expense.effective_until && new Date(expense.effective_until) < new Date();
                return (
                  <li key={expense.id} className={`px-6 py-4 ${isEnded ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {expense.description}
                          </p>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {formatCategory(expense.category)}
                          </span>
                          {isEnded && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Ended
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                          <span>From: {new Date(expense.effective_from).toLocaleDateString()}</span>
                          {expense.effective_until && (
                            <span>Until: {new Date(expense.effective_until).toLocaleDateString()}</span>
                          )}
                        </div>
                        {expense.memo && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {expense.memo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                        {!isEnded && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditModal(expense)}
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {endingExpenseId === expense.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEndFixedExpense(expense.id)}
                                  disabled={isEnding}
                                  className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  {isEnding ? "..." : "End"}
                                </button>
                                <button
                                  onClick={() => setEndingExpenseId(null)}
                                  className="rounded border px-2 py-1 text-xs"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEndingExpenseId(expense.id)}
                                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                                title="End fixed expense"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                How fixed expenses work
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                Fixed expenses automatically create a new expense entry on the 1st of each month (or when you first open the app that month). The expense is posted in your name with the saved amount.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Fixed Expense
            </h2>
            <form onSubmit={handleUpdateFixedExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description *
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Memo (optional)
                </label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
