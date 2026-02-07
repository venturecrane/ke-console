"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type { Expense } from "@/lib/api";
import { formatCurrency } from "@/lib/statusColors";
import { Card, CardBody, StatusBadge, EmptyState } from "@/components/ui";

const QUESTION_DEADLINE_DAYS = 30;
const SATISFACTION_DEADLINE_DAYS = 7;

function daysRemaining(fromDate: string | null, totalDays: number): number | null {
  if (!fromDate) return null;
  const start = new Date(fromDate).getTime();
  const deadlineMs = start + totalDays * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

function CountdownBadge({ days, total }: { days: number | null; total: number }) {
  if (days === null) return null;

  const isUrgent = days <= 3;
  const urgentClass = "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
  const normalClass = "bg-ke-elevated text-ke-muted";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isUrgent ? urgentClass : normalClass}`}
    >
      {days} of {total} days left
    </span>
  );
}

export default function QuestioningDashboardPage() {
  const { user, isLoaded } = useUser();
  const api = useApi();

  const [awaitingResolution, setAwaitingResolution] = useState<Expense[]>([]);
  const [awaitingSatisfaction, setAwaitingSatisfaction] = useState<Expense[]>([]);
  const [recentlyResolved, setRecentlyResolved] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const me = await api.getMe();

      if (!me.family) return;

      const familyId = me.family.id;
      const userId = user.id;

      const [questionedData, pendingSatData, resolvedData, resolvedCreatorData] =
        await Promise.all([
          api.getExpenses(familyId, { status: "questioned", limit: 50 }),
          api.getExpenses(familyId, { status: "pending_satisfaction", limit: 50 }),
          api.getExpenses(familyId, { status: "resolved", limit: 50 }),
          api.getExpenses(familyId, { status: "resolved_creator_decided", limit: 50 }),
        ]);

      // Awaiting Your Resolution: questioned expenses where current user is the creator
      setAwaitingResolution(
        questionedData.expenses.filter((e) => e.created_by === userId)
      );

      // Awaiting Satisfaction: pending_satisfaction where current user is the questioner
      setAwaitingSatisfaction(
        pendingSatData.expenses.filter((e) => e.questioned_by === userId)
      );

      // Recently Resolved: resolved or resolved_creator_decided from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const allResolved = [
        ...resolvedData.expenses,
        ...resolvedCreatorData.expenses,
      ].filter(
        (e) =>
          e.resolved_at && new Date(e.resolved_at).getTime() >= sevenDaysAgo.getTime()
      );
      allResolved.sort(
        (a, b) =>
          new Date(b.resolved_at || b.updated_at).getTime() -
          new Date(a.resolved_at || a.updated_at).getTime()
      );
      setRecentlyResolved(allResolved);
    } catch (err) {
      console.error("Failed to load questioning data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ke-bg">
        <p className="text-ke-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Questions</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Section 1: Awaiting Your Resolution */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ke-muted">
            Awaiting Your Resolution ({awaitingResolution.length})
          </h2>
          {awaitingResolution.length === 0 ? (
            <EmptyState
              title="Nothing to resolve"
              description="No expenses are waiting for your response"
            />
          ) : (
            <div className="space-y-3">
              {awaitingResolution.map((expense) => (
                <Link key={expense.id} href={`/expenses/${expense.id}?focus=actions`}>
                  <Card className="transition-colors hover:bg-ke-elevated">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-ke-primary">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ke-muted">
                            <span className="font-mono">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </span>
                            <CountdownBadge
                              days={daysRemaining(expense.questioned_at, QUESTION_DEADLINE_DAYS)}
                              total={QUESTION_DEADLINE_DAYS}
                            />
                          </div>
                        </div>
                        <p className="shrink-0 font-semibold font-mono text-ke-primary">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Awaiting Satisfaction */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ke-muted">
            Awaiting Satisfaction ({awaitingSatisfaction.length})
          </h2>
          {awaitingSatisfaction.length === 0 ? (
            <EmptyState
              title="Nothing pending"
              description="No responses are waiting for your confirmation"
            />
          ) : (
            <div className="space-y-3">
              {awaitingSatisfaction.map((expense) => (
                <Link key={expense.id} href={`/expenses/${expense.id}?focus=actions`}>
                  <Card className="transition-colors hover:bg-ke-elevated">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-ke-primary">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ke-muted">
                            <span className="font-mono">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </span>
                            <CountdownBadge
                              days={daysRemaining(expense.resolved_at, SATISFACTION_DEADLINE_DAYS)}
                              total={SATISFACTION_DEADLINE_DAYS}
                            />
                          </div>
                        </div>
                        <p className="shrink-0 font-semibold font-mono text-ke-primary">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Recently Resolved */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ke-muted">
            Recently Resolved ({recentlyResolved.length})
          </h2>
          {recentlyResolved.length === 0 ? (
            <EmptyState
              title="No recent resolutions"
              description="Resolved items from the last 7 days will appear here"
            />
          ) : (
            <div className="space-y-3">
              {recentlyResolved.map((expense) => (
                <Link key={expense.id} href={`/expenses/${expense.id}`}>
                  <Card className="transition-colors hover:bg-ke-elevated">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-ke-primary">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                          <div className="mt-1 text-xs text-ke-muted">
                            <span className="font-mono">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </span>
                            {expense.resolved_at && (
                              <span className="ml-3">
                                Resolved {new Date(expense.resolved_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="shrink-0 font-semibold font-mono text-ke-primary">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
