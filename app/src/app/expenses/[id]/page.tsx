"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type {
  MeResponse,
  Expense,
  ActivityEvent,
  QuestionReason,
  ResolutionAction,
} from "@/lib/api";
import { formatCurrency, formatCategory } from "@/lib/statusColors";
import { canQuestion, canRespond, canSatisfy } from "@/lib/expenseActions";
import {
  renderTimelineEvent,
  formatReasonLabel,
  formatResolutionLabel,
} from "@/lib/timelineUtils";
import {
  Button,
  Card,
  CardBody,
  StatusBadge,
  Alert,
} from "@/components/ui";

// ---------- Constants ----------

const QUESTION_REASONS: { value: QuestionReason; label: string }[] = [
  { value: "wrong_amount", label: "Wrong amount" },
  { value: "not_child_related", label: "Not child-related" },
  { value: "duplicate", label: "Duplicate expense" },
  { value: "split_dispute", label: "Split percentage dispute" },
  { value: "other", label: "Other" },
];

const RESOLUTION_ACTIONS: {
  value: ResolutionAction;
  label: string;
  description: string;
}[] = [
  { value: "keep", label: "Keep As-Is", description: "Keep the expense unchanged" },
  { value: "edit", label: "Edit Amount", description: "Update the amount" },
  { value: "personal", label: "Mark as Personal", description: "Won't count in split" },
  { value: "delete", label: "Delete Expense", description: "Remove this expense" },
];

// ---------- Page component ----------

export default function ExpenseDetailPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const api = useApi();
  const actionsRef = useRef<HTMLDivElement>(null);
  const expenseId = params.id as string;

  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionReason, setQuestionReason] = useState<QuestionReason>("wrong_amount");
  const [questionNote, setQuestionNote] = useState("");
  const [isQuestioning, setIsQuestioning] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Respond form state
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [resolveAction, setResolveAction] = useState<ResolutionAction>("keep");
  const [resolveNewAmount, setResolveNewAmount] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Satisfy state
  const [isSatisfying, setIsSatisfying] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const [me, expenseData] = await Promise.all([
        api.getMe(),
        api.getExpense(expenseId),
      ]);
      setMeData(me);
      setExpense(expenseData.expense);

      if (me.family) {
        const activityData = await api.getActivity(me.family.id, {
          expenseId,
          limit: 50,
        });
        // API returns descending; reverse for chronological timeline
        setTimeline([...activityData.events].reverse());
      }
    } catch (err) {
      console.error("Failed to load expense:", err);
      setError(err instanceof Error ? err.message : "Failed to load expense");
    } finally {
      setIsLoading(false);
    }
  }, [user, expenseId, api]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  // Scroll to actions if ?focus=actions
  useEffect(() => {
    if (!isLoading && expense && actionsRef.current) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("focus") === "actions") {
        actionsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isLoading, expense]);

  // ---------- Action handlers ----------

  async function handleQuestion() {
    if (!user || !expense) return;
    setIsQuestioning(true);
    setQuestionError(null);

    try {
      const result = await api.questionExpense(expense.id, {
        reason: questionReason,
        note: questionNote || undefined,
      });
      setExpense(result.expense);
      setShowQuestionForm(false);
      setQuestionReason("wrong_amount");
      setQuestionNote("");
      // Refresh timeline
      await refreshTimeline();
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : "Failed to question expense");
    } finally {
      setIsQuestioning(false);
    }
  }

  async function handleRespond() {
    if (!user || !expense) return;
    setIsResolving(true);
    setResolveError(null);

    try {
      const request: { action: ResolutionAction; newAmount?: number } = {
        action: resolveAction,
      };
      if (resolveAction === "edit") {
        const amount = parseFloat(resolveNewAmount);
        if (isNaN(amount) || amount <= 0) {
          setResolveError("Please enter a valid positive amount");
          setIsResolving(false);
          return;
        }
        request.newAmount = amount;
      }

      const result = await api.resolveExpense(expense.id, request);
      setExpense(result.expense);
      setShowRespondForm(false);
      setResolveAction("keep");
      setResolveNewAmount("");
      await refreshTimeline();

      // If deleted, redirect back to list
      if (resolveAction === "delete") {
        router.push("/expenses");
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Failed to respond");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleSatisfy() {
    if (!user || !expense) return;
    setIsSatisfying(true);

    try {
      const result = await api.satisfyExpense(expense.id);
      setExpense(result.expense);
      await refreshTimeline();
    } catch (err) {
      console.error("Failed to confirm:", err);
    } finally {
      setIsSatisfying(false);
    }
  }

  async function handleStillNotSatisfied() {
    // Re-question the expense (same flow as initial question)
    if (!user || !expense) return;
    setIsQuestioning(true);
    setQuestionError(null);

    try {
      const result = await api.questionExpense(expense.id, {
        reason: "other",
        note: "Still not satisfied with the response",
      });
      setExpense(result.expense);
      await refreshTimeline();
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : "Failed to re-question");
    } finally {
      setIsQuestioning(false);
    }
  }

  async function refreshTimeline() {
    if (!user || !meData?.family) return;
    try {
      const activityData = await api.getActivity(meData.family.id, {
        expenseId,
        limit: 50,
      });
      setTimeline([...activityData.events].reverse());
    } catch {
      // Non-critical; timeline will refresh on next page load
    }
  }

  // ---------- Loading / error states ----------

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ke-bg">
        <p className="text-ke-muted">Loading...</p>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
            <Link href="/expenses" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Expense Detail</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Alert variant="error">{error || "Expense not found"}</Alert>
        </main>
      </div>
    );
  }

  const userId = user?.id || "";
  const isCreator = expense.created_by === userId;

  return (
    <div className="min-h-screen bg-ke-bg">
      {/* Header */}
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href="/expenses" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ke-muted hover:text-ke-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-ke-primary">Expense Detail</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* ---------- Expense Summary ---------- */}
        <Card>
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium text-ke-primary">
                  {expense.description}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ke-muted">
                  <span className="font-mono text-sm">
                    {new Date(expense.expense_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Posted by {isCreator ? "You" : (meData?.family ? "Partner" : "Unknown")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-ke-elevated px-2 py-0.5 text-xs font-medium text-ke-secondary">
                    {formatCategory(expense.category)}
                  </span>
                  <StatusBadge status={expense.status} />
                </div>
              </div>
              <p className="shrink-0 text-2xl font-semibold font-mono text-ke-primary">
                {formatCurrency(expense.amount_cents)}
              </p>
            </div>

            {/* Memo */}
            {expense.memo && (
              <p className="mt-3 text-sm text-ke-secondary border-t border-ke-divider pt-3">
                {expense.memo}
              </p>
            )}
          </CardBody>
        </Card>

        {/* ---------- Actions ---------- */}
        <div ref={actionsRef}>
          {/* Question action */}
          {canQuestion(expense, userId) && (
            <Card>
              <CardBody>
                {!showQuestionForm ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowQuestionForm(true)}
                    className="min-h-[44px]"
                  >
                    Question This Expense
                  </Button>
                ) : (
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ke-muted">
                      Question Expense
                    </h3>

                    {questionError && (
                      <Alert variant="error" className="mb-4">
                        {questionError}
                      </Alert>
                    )}

                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                        Reason
                      </label>
                      <select
                        value={questionReason}
                        onChange={(e) => setQuestionReason(e.target.value as QuestionReason)}
                        className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                      >
                        {QUESTION_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                        Note (optional)
                      </label>
                      <textarea
                        value={questionNote}
                        onChange={(e) => setQuestionNote(e.target.value)}
                        placeholder="Add details..."
                        rows={3}
                        className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowQuestionForm(false);
                          setQuestionError(null);
                        }}
                        disabled={isQuestioning}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleQuestion}
                        disabled={isQuestioning}
                        className="min-h-[44px]"
                      >
                        {isQuestioning ? "Submitting..." : "Submit Question"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Respond action */}
          {canRespond(expense, userId) && (
            <Card>
              <CardBody>
                {/* Show the question context */}
                {expense.question_reason && (
                  <div className="mb-4 rounded-lg bg-ke-status-questioned-bg p-3">
                    <p className="text-sm font-medium text-ke-status-questioned-text">
                      Questioned: {formatReasonLabel(expense.question_reason)}
                    </p>
                    {expense.question_note && (
                      <p className="mt-1 text-sm text-ke-status-questioned-text opacity-80">
                        &ldquo;{expense.question_note}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {!showRespondForm ? (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setShowRespondForm(true);
                      setResolveNewAmount((expense.amount_cents / 100).toString());
                    }}
                    className="min-h-[44px]"
                  >
                    Respond
                  </Button>
                ) : (
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ke-muted">
                      Respond to Question
                    </h3>

                    {resolveError && (
                      <Alert variant="error" className="mb-4">
                        {resolveError}
                      </Alert>
                    )}

                    <div className="mb-4 space-y-2">
                      {RESOLUTION_ACTIONS.map((action) => (
                        <label
                          key={action.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors min-h-[44px] ${
                            resolveAction === action.value
                              ? "border-ke-accent bg-ke-accent/10"
                              : "border-ke-border hover:bg-ke-elevated"
                          }`}
                        >
                          <input
                            type="radio"
                            name="resolveAction"
                            value={action.value}
                            checked={resolveAction === action.value}
                            onChange={(e) => setResolveAction(e.target.value as ResolutionAction)}
                            className="h-4 w-4 text-ke-accent"
                          />
                          <div>
                            <p className="text-sm font-medium text-ke-primary">{action.label}</p>
                            <p className="text-xs text-ke-muted">{action.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {resolveAction === "edit" && (
                      <div className="mb-4">
                        <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                          New Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={resolveNewAmount}
                          onChange={(e) => setResolveNewAmount(e.target.value)}
                          className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm font-mono text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowRespondForm(false);
                          setResolveError(null);
                        }}
                        disabled={isResolving}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      {resolveAction === "delete" ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleRespond}
                          disabled={isResolving}
                          className="min-h-[44px]"
                        >
                          {isResolving ? "Submitting..." : "Delete Expense"}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleRespond}
                          disabled={isResolving}
                          className="min-h-[44px]"
                        >
                          {isResolving ? "Submitting..." : "Submit Response"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Satisfy / Still Not Satisfied actions */}
          {canSatisfy(expense, userId) && (
            <Card>
              <CardBody>
                {/* Show resolution context */}
                {expense.resolution_action && (
                  <div className="mb-4 rounded-lg bg-ke-attention-bg p-3">
                    <p className="text-sm font-medium text-ke-primary">
                      Creator responded: {formatResolutionLabel(expense.resolution_action)}
                    </p>
                    <p className="mt-1 text-sm text-ke-secondary">
                      Waiting for your confirmation
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleSatisfy}
                    disabled={isSatisfying || isQuestioning}
                    className="min-h-[44px]"
                  >
                    {isSatisfying ? "Confirming..." : "Confirm Resolved"}
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleStillNotSatisfied}
                    disabled={isSatisfying || isQuestioning}
                    className="min-h-[44px]"
                  >
                    {isQuestioning ? "..." : "Still Not Satisfied"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Closed unresolved — read-only badge, no actions */}
          {expense.status === "closed_unresolved" && (
            <Card>
              <CardBody>
                <p className="text-sm text-ke-muted text-center">
                  This expense is closed with no resolution. No actions available.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------- Timeline ---------- */}
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ke-muted">
            Timeline
          </h3>

          {timeline.length === 0 ? (
            <p className="text-sm text-ke-muted">No activity recorded yet.</p>
          ) : (
            <div className="relative border-l-2 border-ke-divider pl-6 space-y-6">
              {timeline.map((event) => {
                const rendered = renderTimelineEvent(event, userId);
                if (!rendered) return null;

                return (
                  <div key={event.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ke-border bg-ke-surface" />

                    <p className="font-mono text-xs text-ke-muted">
                      {new Date(event.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {new Date(event.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ke-primary">
                      {rendered.label}
                    </p>
                    {rendered.detail && (
                      <p className="mt-0.5 text-sm text-ke-secondary">
                        {rendered.detail}
                      </p>
                    )}
                    {rendered.note && (
                      <p className="mt-1 text-sm text-ke-muted italic">
                        &ldquo;{rendered.note}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
