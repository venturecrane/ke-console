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
  type FixedExpenseTier,
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
  const [tier, setTier] = useState<FixedExpenseTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeEnded, setIncludeEnded] = useState(false);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState<ExpenseCategory>("other");
  const [addEffectiveFrom, setAddEffectiveFrom] = useState(getTodayDate());
  const [addEffectiveUntil, setAddEffectiveUntil] = useState("");
  const [addLinkUrl, setAddLinkUrl] = useState("");
  const [addMemo, setAddMemo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("other");
  const [editEffectiveUntil, setEditEffectiveUntil] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // End (delete) state
  const [endingId, setEndingId] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState<string | null>(null);

  const fetchFixedExpenses = useCallback(async () => {
    if (!user || !meData?.family) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getFixedExpenses(user.id, meData.family.id, includeEnded);
      setFixedExpenses(data.fixedExpenses);
      setTier(data.tier);
    } catch (err) {
      console.error("Failed to fetch fixed expenses:", err);
      setError("Failed to load fixed expenses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, meData?.family, includeEnded]);

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

  async function handleAddFixedExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const amount = parseFloat(addAmount);
      if (isNaN(amount) || amount <= 0) {
        setAddError("Please enter a valid positive amount");
        setIsAdding(false);
        return;
      }

      const result = await createFixedExpense(user.id, meData.family.id, {
        description: addDescription.trim(),
        amount,
        category: addCategory,
        effectiveFrom: addEffectiveFrom,
        effectiveUntil: addEffectiveUntil || undefined,
        linkUrl: addLinkUrl || undefined,
        memo: addMemo || undefined,
      });

      setFixedExpenses((prev) => [result.fixedExpense, ...prev]);
      if (tier) {
        setTier({ ...tier, current: tier.current + 1, canAdd: tier.limit === -1 || tier.current + 1 < tier.limit });
      }

      // Reset form
      setShowAddForm(false);
      setAddDescription("");
      setAddAmount("");
      setAddCategory("other");
      setAddEffectiveFrom(getTodayDate());
      setAddEffectiveUntil("");
      setAddLinkUrl("");
      setAddMemo("");
    } catch (err) {
      console.error("Failed to add fixed expense:", err);
      setAddError(err instanceof Error ? err.message : "Failed to add fixed expense");
    } finally {
      setIsAdding(false);
    }
  }

  function openEditModal(expense: FixedExpense) {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditAmount((expense.amount_cents / 100).toString());
    setEditCategory(expense.category as ExpenseCategory);
    setEditEffectiveUntil(expense.effective_until || "");
    setEditLinkUrl(expense.link_url || "");
    setEditMemo(expense.memo || "");
    setEditError(null);
  }

  async function handleEditFixedExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family || !editingExpense) return;

    setIsEditing(true);
    setEditError(null);

    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError("Please enter a valid positive amount");
        setIsEditing(false);
        return;
      }

      const result = await updateFixedExpense(user.id, meData.family.id, editingExpense.id, {
        description: editDescription.trim(),
        amount,
        category: editCategory,
        effectiveUntil: editEffectiveUntil || null,
        linkUrl: editLinkUrl || null,
        memo: editMemo || null,
      });

      setFixedExpenses((prev) =>
        prev.map((exp) => (exp.id === result.fixedExpense.id ? result.fixedExpense : exp))
      );

      setEditingExpense(null);
    } catch (err) {
      console.error("Failed to update fixed expense:", err);
      setEditError(err instanceof Error ? err.message : "Failed to update fixed expense");
    } finally {
      setIsEditing(false);
    }
  }

  async function handleEndFixedExpense(id: string) {
    if (!user || !meData?.family) return;

    setEndingId(id);

    try {
      const result = await endFixedExpense(user.id, meData.family.id, id);

      if (includeEnded) {
        // Update the expense in place
        setFixedExpenses((prev) =>
          prev.map((exp) => (exp.id === result.fixedExpense.id ? result.fixedExpense : exp))
        );
      } else {
        // Remove from list since we're not showing ended ones
        setFixedExpenses((prev) => prev.filter((exp) => exp.id !== id));
      }

      if (tier) {
        setTier({ ...tier, current: tier.current - 1, canAdd: true });
      }

      setShowEndConfirm(null);
    } catch (err) {
      console.error("Failed to end fixed expense:", err);
      setError(err instanceof Error ? err.message : "Failed to end fixed expense");
    } finally {
      setEndingId(null);
    }
  }

  // Check if expense is ended
  function isExpenseEnded(expense: FixedExpense): boolean {
    if (!expense.effective_until) return false;
    return new Date(expense.effective_until) < new Date();
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

        {/* Tier Info & Add Button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
              Recurring Monthly Templates
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {tier && (
                tier.limit === -1
                  ? `${tier.current} active fixed expenses (Pro: Unlimited)`
                  : `${tier.current} of ${tier.limit} fixed expenses used (Free tier)`
              )}
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={tier !== null && !tier.canAdd}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add Fixed Expense
          </button>
        </div>

        {/* Tier Limit Warning */}
        {tier && !tier.canAdd && tier.limit !== -1 && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  Fixed expense limit reached
                </p>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                  Free tier allows up to {tier.limit} fixed expenses. Upgrade to Pro for unlimited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Add Fixed Expense
            </h2>

            {addError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
              </div>
            )}

            <form onSubmit={handleAddFixedExpense} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="e.g., Monthly tuition"
                    maxLength={200}
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category *
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    value={addEffectiveFrom}
                    onChange={(e) => setAddEffectiveFrom(e.target.value)}
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Effective Until (optional)
                  </label>
                  <input
                    type="date"
                    value={addEffectiveUntil}
                    onChange={(e) => setAddEffectiveUntil(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={addLinkUrl}
                    onChange={(e) => setAddLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Memo (optional)
                </label>
                <textarea
                  value={addMemo}
                  onChange={(e) => setAddMemo(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={isAdding}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !addDescription.trim() || !addAmount}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isAdding ? "Adding..." : "Add Fixed Expense"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Include Ended Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="includeEnded"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          <label htmlFor="includeEnded" className="text-sm text-zinc-600 dark:text-zinc-400">
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
              These templates auto-generate expenses on the 1st of each month.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-zinc-500">Loading fixed expenses...</p>
            </div>
          ) : fixedExpenses.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg
                  className="h-6 w-6 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">No fixed expenses yet</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add recurring monthly expenses like rent, tuition, or subscriptions.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fixedExpenses.map((expense) => (
                <li key={expense.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {expense.description}
                        </p>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {formatCategory(expense.category)}
                        </span>
                        {isExpenseEnded(expense) && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <span>
                          {formatCurrency(expense.amount_cents)}/month
                        </span>
                        <span>
                          From: {new Date(expense.effective_from).toLocaleDateString()}
                        </span>
                        {expense.effective_until && (
                          <span>
                            Until: {new Date(expense.effective_until).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {expense.memo && (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {expense.memo}
                        </p>
                      )}
                    </div>

                    {!isExpenseEnded(expense) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          title="Edit"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {showEndConfirm === expense.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">End?</span>
                            <button
                              onClick={() => handleEndFixedExpense(expense.id)}
                              disabled={endingId === expense.id}
                              className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                              {endingId === expense.id ? "..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setShowEndConfirm(null)}
                              disabled={endingId === expense.id}
                              className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowEndConfirm(expense.id)}
                            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                            title="End fixed expense"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
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
                Fixed expenses automatically generate regular expenses on the 1st of each month (or when you first open the app that month). Only active templates within their effective date range will generate expenses.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Fixed Expense
            </h3>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditFixedExpense} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description *
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={200}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Category *
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Effective Until (optional)
                </label>
                <input
                  type="date"
                  value={editEffectiveUntil}
                  onChange={(e) => setEditEffectiveUntil(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Memo (optional)
                </label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  disabled={isEditing}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing || !editDescription.trim() || !editAmount}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
