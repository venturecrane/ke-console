"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  generateInviteCode,
  getExpenses,
  getBalance,
  type MeResponse,
  type Expense,
  type BalanceResponse,
} from "@/lib/api";

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

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [syncStatus, setSyncStatus] = useState<"pending" | "synced" | "error">(
    "pending"
  );
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMe(user.id);
      setMeData(data);
      if (data.family?.invite_code) {
        setInviteCode(data.family.invite_code);
        setInviteExpiresAt(data.family.invite_expires_at);
      }
      // Fetch expenses and balance if user has a family
      if (data.family) {
        setIsLoadingExpenses(true);
        setIsLoadingBalance(true);
        try {
          const [expenseData, balanceData] = await Promise.all([
            getExpenses(user.id, data.family.id, { limit: 5 }),
            getBalance(user.id, data.family.id),
          ]);
          setExpenses(expenseData.expenses);
          setBalance(balanceData);
        } catch (err) {
          console.error("Failed to fetch data:", err);
        } finally {
          setIsLoadingExpenses(false);
          setIsLoadingBalance(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, [user]);

  useEffect(() => {
    async function syncUser() {
      if (!user) return;

      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          setSyncStatus("synced");
          // Fetch user data after sync
          await fetchUserData();
        } else {
          setSyncStatus("error");
        }
      } catch {
        setSyncStatus("error");
      }
    }

    if (isLoaded && user) {
      syncUser();
    }
  }, [isLoaded, user, fetchUserData]);

  async function handleGenerateInvite() {
    if (!user || !meData?.family) return;

    setIsGeneratingInvite(true);
    try {
      const result = await generateInviteCode(user.id, meData.family.id);
      setInviteCode(result.inviteCode);
      setInviteExpiresAt(result.expiresAt);
    } catch (error) {
      console.error("Failed to generate invite:", error);
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error("Failed to copy invite code");
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const hasFamily = meData?.family !== null;
  const isParentA = meData?.role === "parent_a";
  const hasPartner = meData?.family?.parent_b_id !== null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Kid Expenses
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Welcome Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Welcome, {user?.firstName || "there"}!
          </h2>
          {syncStatus === "pending" && (
            <p className="text-sm text-zinc-500">Loading your data...</p>
          )}
          {syncStatus === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load data. Please refresh the page.
            </p>
          )}
          {syncStatus === "synced" && !hasFamily && (
            <p className="text-zinc-600 dark:text-zinc-400">
              Get started by creating a family or joining one with an invite
              code.
            </p>
          )}
          {syncStatus === "synced" && hasFamily && (
            <p className="text-zinc-600 dark:text-zinc-400">
              {meData?.family?.name
                ? `Managing expenses for ${meData.family.name}`
                : "Your family expense tracker is ready"}
            </p>
          )}
        </div>

        {/* No Family - Show Create/Join Options */}
        {syncStatus === "synced" && !hasFamily && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/family/create"
              className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Create a Family
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Start tracking expenses and invite your co-parent to join
              </p>
            </Link>

            <Link
              href="/family/join"
              className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Join a Family
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Have an invite code? Join your co-parent&apos;s family
              </p>
            </Link>
          </div>
        )}

        {/* Has Family - Show Family Info */}
        {syncStatus === "synced" && hasFamily && (
          <>
            {/* Family Card */}
            <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {meData?.family?.name || "Your Family"}
                </h3>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {isParentA ? "Creator" : "Member"}
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Split Ratio
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}% /{" "}
                    {Math.round(
                      (1 - (meData?.family?.parent_a_ratio || 0.5)) * 100
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Co-Parent
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {hasPartner ? "Connected" : "Not yet joined"}
                  </p>
                </div>
              </div>

              {/* Invite Section - Only for parent_a without partner */}
              {isParentA && !hasPartner && (
                <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                  <h4 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                    Invite Your Co-Parent
                  </h4>
                  {inviteCode ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-zinc-100 px-3 py-2 font-mono text-lg tracking-widest dark:bg-zinc-800">
                            {inviteCode}
                          </code>
                          <button
                            onClick={handleCopyInvite}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            {copySuccess ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        {inviteExpiresAt && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Expires{" "}
                            {new Date(inviteExpiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleGenerateInvite}
                        disabled={isGeneratingInvite}
                        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        Generate new code
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateInvite}
                      disabled={isGeneratingInvite}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {isGeneratingInvite
                        ? "Generating..."
                        : "Generate Invite Code"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Balance Card */}
            <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Balance
              </h3>
              {isLoadingBalance ? (
                <p className="text-sm text-zinc-500">Calculating balance...</p>
              ) : balance ? (
                <div>
                  {balance.balance_cents === 0 ? (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">Settled Up!</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        No balance between you and your co-parent
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(balance.balance_cents)}
                      </p>
                      <p className="text-lg mt-2">
                        {balance.payer_id === user?.id ? (
                          <span className="text-red-600 dark:text-red-400">
                            You owe your co-parent
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">
                            Your co-parent owes you
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Breakdown */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500 dark:text-zinc-400">Included Expenses</p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {balance.breakdown.included_expenses_count} ({formatCurrency(balance.breakdown.total_expenses_cents)})
                        </p>
                      </div>
                      {balance.breakdown.questioned_count > 0 && (
                        <div>
                          <p className="text-zinc-500 dark:text-zinc-400">Questioned</p>
                          <p className="font-medium text-yellow-600 dark:text-yellow-400">
                            {balance.breakdown.questioned_count} ({formatCurrency(balance.breakdown.questioned_total_cents)})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Actions */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <Link
                      href="/payments"
                      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      View Payment History
                    </Link>
                    {balance.balance_cents !== 0 && balance.payer_id === user?.id && (
                      <Link
                        href="/payments/add"
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                      >
                        Record Payment
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No balance data available</p>
              )}
            </div>

            {/* Quick Links */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/settings/children"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <svg
                    className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Manage Children
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Add or remove children for expense tagging
                  </p>
                </div>
              </Link>
              <Link
                href="/settings/fixed-expenses"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <svg
                    className="h-5 w-5 text-purple-600 dark:text-purple-400"
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
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Fixed Expenses
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Recurring monthly expense templates
                  </p>
                </div>
              </Link>
              <Link
                href="/activity"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg
                    className="h-5 w-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Activity Feed
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    View recent actions by you and your co-parent
                  </p>
                </div>
              </Link>
              <Link
                href="/expenses/add"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <svg
                    className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Add Expense
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Record a new shared expense
                  </p>
                </div>
              </Link>
              <Link
                href="/payments/add"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg
                    className="h-5 w-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Record Payment
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Log a payment to your co-parent
                  </p>
                </div>
              </Link>
              <Link
                href="/expenses"
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <svg
                    className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    All Expenses
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    View, filter, and manage all expenses
                  </p>
                </div>
              </Link>
            </div>

            {/* Expenses Section */}
            <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Recent Expenses
                </h3>
                <div className="flex items-center gap-3">
                  <Link
                    href="/expenses"
                    className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    View All
                  </Link>
                  <Link
                    href="/expenses/add"
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Add Expense
                  </Link>
                </div>
              </div>

              {isLoadingExpenses && (
                <p className="text-sm text-zinc-500">Loading expenses...</p>
              )}

              {!isLoadingExpenses && expenses.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No expenses yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Add your first expense to get started
                  </p>
                </div>
              )}

              {!isLoadingExpenses && expenses.length > 0 && (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 p-4 dark:border-zinc-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {expense.description}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(expense.status)}`}
                          >
                            {expense.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                          <span>{formatCategory(expense.category)}</span>
                          <span>
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${expense.amount_cents < 0 ? "text-green-600 dark:text-green-400" : "text-zinc-900 dark:text-zinc-100"}`}
                        >
                          {expense.amount_cents < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(expense.amount_cents))}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {expense.paid_by === user?.id ? "You paid" : "Partner paid"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
