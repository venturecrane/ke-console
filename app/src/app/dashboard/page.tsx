"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  getExpenses,
  getBalance,
  type MeResponse,
  type Expense,
  type BalanceResponse,
} from "@/lib/api";
import { formatCurrency, formatCategory } from "@/lib/statusColors";
import {
  Button,
  Card,
  CardBody,
  StatusBadge,
  SectionHeader,
  EmptyState,
  Alert,
} from "@/components/ui";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [syncStatus, setSyncStatus] = useState<"pending" | "synced" | "error">(
    "pending"
  );
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [attentionExpenses, setAttentionExpenses] = useState<Expense[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMe(user.id);
      setMeData(data);
      if (data.family) {
        setIsLoadingExpenses(true);
        setIsLoadingBalance(true);
        try {
          const [expenseData, balanceData, ...attentionResults] = await Promise.all([
            getExpenses(user.id, data.family.id, { limit: 5 }),
            getBalance(user.id, data.family.id),
            ...(data.family.parent_b_id !== null
              ? [
                  getExpenses(user.id, data.family.id, { status: "questioned", limit: 10 }),
                  getExpenses(user.id, data.family.id, { status: "pending_satisfaction", limit: 10 }),
                ]
              : []),
          ]);
          setExpenses(expenseData.expenses);
          setBalance(balanceData);

          if (data.family.parent_b_id !== null && attentionResults.length === 2) {
            const questioned = (attentionResults[0] as { expenses: Expense[] }).expenses;
            const pendingSatisfaction = (attentionResults[1] as { expenses: Expense[] }).expenses;
            const merged = [...questioned, ...pendingSatisfaction].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setAttentionExpenses(merged);
          }
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

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    );
  }

  const hasFamily = meData?.family !== null;
  const isParentA = meData?.role === "parent_a";
  const hasPartner = meData?.family?.parent_b_id !== null;

  // Balance color logic
  const getBalanceColor = () => {
    if (!balance || balance.balance_cents === 0) return "text-ke-positive";
    if (balance.payer_id === user?.id) return "text-ke-negative";
    return "text-ke-accent";
  };

  const getBalanceDirection = () => {
    if (!balance || balance.balance_cents === 0) return null;
    if (balance.payer_id === user?.id) return "You owe";
    return "You are owed";
  };

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="sticky top-0 z-30 border-b border-ke-border bg-ke-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ke-accent text-xs font-bold text-ke-inverse">
              KE
            </div>
            <h1 className="text-lg font-semibold text-ke-primary">
              Kid Expenses
            </h1>
            {meData?.family?.name && (
              <span className="hidden text-sm text-ke-muted sm:inline">
                {meData.family.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ke-secondary sm:inline">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Loading/Error State */}
        {syncStatus === "pending" && (
          <Card>
            <CardBody>
              <p className="text-sm text-ke-muted">Loading your data...</p>
            </CardBody>
          </Card>
        )}
        {syncStatus === "error" && (
          <Alert variant="error">
            Failed to load data. Please refresh the page.
          </Alert>
        )}

        {/* No Family - Show Welcome and Create/Join Options */}
        {syncStatus === "synced" && !hasFamily && (
          <>
            <Card>
              <CardBody>
                <h2 className="mb-4 text-lg font-medium text-ke-primary">
                  Welcome, {user?.firstName || "there"}!
                </h2>
                <p className="text-ke-secondary">
                  Get started by creating a family or joining one with an invite
                  code.
                </p>
              </CardBody>
            </Card>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/family/create"
                className="rounded-lg border border-ke-border bg-ke-surface p-6 transition-colors hover:bg-ke-elevated"
              >
                <h3 className="mb-2 text-lg font-medium text-ke-primary">
                  Create a Family
                </h3>
                <p className="text-sm text-ke-secondary">
                  Start tracking expenses and invite your co-parent to join
                </p>
              </Link>

              <Link
                href="/family/join"
                className="rounded-lg border border-ke-border bg-ke-surface p-6 transition-colors hover:bg-ke-elevated"
              >
                <h3 className="mb-2 text-lg font-medium text-ke-primary">
                  Join a Family
                </h3>
                <p className="text-sm text-ke-secondary">
                  Have an invite code? Join your co-parent&apos;s family
                </p>
              </Link>
            </div>
          </>
        )}

        {/* Has Family - Dashboard */}
        {syncStatus === "synced" && hasFamily && (
          <>
            {/* Net Balance Card */}
            <Card>
              <CardBody>
                {isLoadingBalance ? (
                  <p className="text-center text-sm text-ke-muted">Calculating balance...</p>
                ) : balance ? (
                  <div className="text-center">
                    <SectionHeader title="Net Balance" className="justify-center" />
                    <p className={`mt-2 text-4xl font-bold font-mono ${getBalanceColor()}`}>
                      {balance.balance_cents === 0
                        ? "$0.00"
                        : formatCurrency(balance.balance_cents)}
                    </p>
                    <p className="mt-1 text-sm text-ke-muted">
                      {balance.balance_cents === 0
                        ? (hasPartner ? "Settled up" : "No expenses recorded yet")
                        : getBalanceDirection()}
                    </p>

                    {/* Summary Stats */}
                    {balance.breakdown.total_expenses_cents > 0 && (
                      <div className="mt-6 border-t border-ke-divider pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                              Total Expenses
                            </p>
                            <p className="mt-1 text-lg font-semibold font-mono text-ke-primary">
                              {formatCurrency(balance.breakdown.total_expenses_cents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                              Your Share
                            </p>
                            <p className="mt-1 text-lg font-semibold font-mono text-ke-primary">
                              {formatCurrency(isParentA ? balance.breakdown.a_share_cents : balance.breakdown.b_share_cents)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <SectionHeader title="Net Balance" className="justify-center" />
                    <p className="mt-2 text-4xl font-bold font-mono text-ke-muted">
                      $0.00
                    </p>
                    <p className="mt-1 text-sm text-ke-muted">
                      No expenses recorded yet
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Needs Attention Section */}
            {attentionExpenses.length > 0 && (
              <div className="mt-6 rounded-lg border border-ke-attention-border/30 bg-ke-surface">
                <div className="border-l-4 border-ke-attention-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-ke-status-questioned-text">
                      Needs Attention ({attentionExpenses.length})
                    </h3>
                    <Link
                      href="/expenses?status=questioned"
                      className="text-xs font-medium text-ke-status-questioned-text hover:opacity-80"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-ke-divider">
                    {attentionExpenses.slice(0, 3).map((expense) => (
                      <Link
                        key={expense.id}
                        href={`/expenses/${expense.id}`}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ke-primary">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                        </div>
                        <p className="ml-4 shrink-0 text-sm font-semibold font-mono text-ke-primary">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/expenses/add">
                <Button fullWidth size="lg">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Expense
                </Button>
              </Link>
              <Link href="/payments/add">
                <Button variant="secondary" fullWidth size="lg">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Record Payment
                </Button>
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                All Expenses
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                Payment History
              </Link>
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                Activity Feed
              </Link>
            </div>

            {/* Recent Activity */}
            <Card className="mt-8">
              <div className="flex items-center justify-between px-6 py-4">
                <SectionHeader title="Recent Activity" />
                <Link
                  href="/expenses"
                  className="text-sm text-ke-secondary hover:text-ke-primary"
                >
                  View All
                </Link>
              </div>

              {isLoadingExpenses && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-ke-muted">Loading...</p>
                </div>
              )}

              {!isLoadingExpenses && expenses.length === 0 && (
                <CardBody>
                  <EmptyState
                    title="No expenses yet"
                    description="Add your first expense to get started"
                    className="border-0"
                  />
                </CardBody>
              )}

              {!isLoadingExpenses && expenses.length > 0 && (
                <div className="divide-y divide-ke-divider">
                  {expenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-ke-elevated"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={expense.status} />
                          <p className="truncate font-medium text-ke-primary">
                            {expense.description}
                          </p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-ke-muted">
                          <span>{formatCategory(expense.category)}</span>
                          <span className="font-mono">{new Date(expense.expense_date).toLocaleDateString()}</span>
                          <span>{expense.paid_by === user?.id ? "You paid" : "Partner paid"}</span>
                        </div>
                      </div>
                      <p className={`ml-4 shrink-0 font-semibold font-mono ${expense.amount_cents < 0 ? "text-ke-positive" : "text-ke-primary"}`}>
                        {expense.amount_cents < 0 ? "-" : ""}
                        {formatCurrency(Math.abs(expense.amount_cents))}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
