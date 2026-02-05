"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  generateInviteCode,
  getExpenses,
  getBalance,
  getPendingInvites,
  cancelInvite,
  getChildren,
  updateFamily,
  getFixedExpenses,
  type MeResponse,
  type Expense,
  type BalanceResponse,
  type PendingInvite,
  type Child,
  type FixedExpense,
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
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "questioned":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "pending_satisfaction":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "resolved":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
    case "resolved_creator_decided":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "resolved_personal":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    case "resolved_deleted":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    case "closed_unresolved":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
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
  // Invite state
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showCodeFallback, setShowCodeFallback] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  // Split ratio editing state
  const [isEditingSplitRatio, setIsEditingSplitRatio] = useState(false);
  const [splitRatioA, setSplitRatioA] = useState(50);
  const [isSavingSplitRatio, setIsSavingSplitRatio] = useState(false);
  // Setup wizard expand/collapse state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [setupExpandedForEdits, setSetupExpandedForEdits] = useState(false);
  // Attention expenses state
  const [attentionExpenses, setAttentionExpenses] = useState<Expense[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMe(user.id);
      setMeData(data);
      if (data.family?.invite_code) {
        setInviteCode(data.family.invite_code);
        setInviteExpiresAt(data.family.invite_expires_at);
      }
      // Fetch expenses, balance, and children if user has a family
      if (data.family) {
        setIsLoadingExpenses(true);
        setIsLoadingBalance(true);
        try {
          const [expenseData, balanceData, invitesData, childrenData, fixedExpenseData, ...attentionResults] = await Promise.all([
            getExpenses(user.id, data.family.id, { limit: 5 }),
            getBalance(user.id, data.family.id),
            // Only fetch pending invites if user is parent_a and no parent_b
            data.family.parent_b_id === null
              ? getPendingInvites(user.id, data.family.id)
              : Promise.resolve({ invites: [] }),
            getChildren(user.id, data.family.id),
            getFixedExpenses(user.id, data.family.id),
            // Fetch attention expenses only when partner exists
            ...(data.family.parent_b_id !== null
              ? [
                  getExpenses(user.id, data.family.id, { status: "questioned", limit: 10 }),
                  getExpenses(user.id, data.family.id, { status: "pending_satisfaction", limit: 10 }),
                ]
              : []),
          ]);
          setExpenses(expenseData.expenses);
          setBalance(balanceData);
          setPendingInvites(invitesData.invites.filter(i => !i.is_expired));
          setChildren(childrenData.children);
          setFixedExpenses(fixedExpenseData.fixedExpenses);

          // Merge and sort attention expenses
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

  async function handleCancelInvite(inviteId: string) {
    if (!user || !meData?.family) return;

    try {
      await cancelInvite(user.id, meData.family.id, inviteId);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    }
  }

  async function handleShareInvite() {
    if (!user || !meData?.family) return;

    setIsGeneratingInvite(true);
    setInviteError(null);

    try {
      // Generate invite code if we don't have one
      let code = inviteCode;
      if (!code) {
        const result = await generateInviteCode(user.id, meData.family.id);
        code = result.inviteCode;
        setInviteCode(result.inviteCode);
        setInviteExpiresAt(result.expiresAt);
      }

      const shareUrl = `${window.location.origin}/family/join?code=${code}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Join me on KidExpenses',
          text: 'Join me on KidExpenses to track our shared kid expenses together.',
          url: shareUrl
        });
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setCopyLinkSuccess(true);
        setTimeout(() => setCopyLinkSuccess(false), 2000);
      }
    } catch (error) {
      // User cancelled share dialog is not an error
      if (error instanceof Error && error.name !== 'AbortError') {
        setInviteError("Failed to share invite");
      }
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  function handleEditSplitRatio() {
    if (meData?.family) {
      setSplitRatioA(Math.round((meData.family.parent_a_ratio || 0.5) * 100));
      setIsEditingSplitRatio(true);
    }
  }

  async function handleSaveSplitRatio() {
    if (!user || !meData?.family) return;

    setIsSavingSplitRatio(true);
    try {
      const result = await updateFamily(user.id, meData.family.id, {
        parentARatio: splitRatioA / 100,
      });
      // Update local state with new family data
      setMeData({
        ...meData,
        family: result.family,
      });
      setIsEditingSplitRatio(false);
    } catch (error) {
      console.error("Failed to update split ratio:", error);
    } finally {
      setIsSavingSplitRatio(false);
    }
  }

  function handleCancelSplitRatio() {
    setIsEditingSplitRatio(false);
    if (meData?.family) {
      setSplitRatioA(Math.round((meData.family.parent_a_ratio || 0.5) * 100));
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const hasFamily = meData?.family !== null;
  const isParentA = meData?.role === "parent_a";
  const hasPartner = meData?.family?.parent_b_id !== null;
  const hasChildren = children.length > 0;
  const hasFixedExpenses = fixedExpenses.length > 0;
  // Setup is complete when co-parent has joined AND at least one child is added
  const isSetupComplete = hasPartner && hasChildren;

  // Step completion states
  const stepCompletion = {
    kids: hasChildren,
    recurring: hasFixedExpenses,
    coparent: hasPartner,
    split: true, // Always complete (has default)
  };

  // All steps complete
  const allStepsComplete = stepCompletion.kids && stepCompletion.recurring && stepCompletion.coparent && stepCompletion.split;

  // Toggle section expand/collapse
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Determine if a section is expanded (incomplete sections default to expanded, completed default to collapsed)
  const isSectionExpanded = (section: keyof typeof stepCompletion) => {
    if (expandedSections[section] !== undefined) {
      return expandedSections[section];
    }
    // Default: incomplete sections are expanded, completed sections are collapsed
    return !stepCompletion[section];
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              KE
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Kid Expenses
            </h1>
            {isSetupComplete && meData?.family?.name && (
              <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
                {meData.family.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:inline">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Loading/Error State */}
        {syncStatus === "pending" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm text-slate-500">Loading your data...</p>
          </div>
        )}
        {syncStatus === "error" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load data. Please refresh the page.
            </p>
          </div>
        )}

        {/* No Family - Show Welcome and Create/Join Options */}
        {syncStatus === "synced" && !hasFamily && (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                Welcome, {user?.firstName || "there"}!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Get started by creating a family or joining one with an invite
                code.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/family/create"
                className="rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              >
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
                  Create a Family
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Start tracking expenses and invite your co-parent to join
                </p>
              </Link>

              <Link
                href="/family/join"
                className="rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              >
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
                  Join a Family
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Have an invite code? Join your co-parent&apos;s family
                </p>
              </Link>
            </div>
          </>
        )}

        {/* Has Family but Setup NOT Complete - Show Setup Wizard */}
        {syncStatus === "synced" && hasFamily && !isSetupComplete && (
          <>
            {/* Setup Wizard Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              {allStepsComplete && !setupExpandedForEdits ? (
                /* All steps complete - minimal state */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-emerald-800 dark:text-emerald-300">
                        Setup Complete
                      </h2>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        All steps finished. You&apos;re ready to track expenses!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSetupExpandedForEdits(true)}
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Edit settings
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              ) : (
                /* Show setup steps */
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
                        {allStepsComplete ? 'Setup Settings' : 'Complete Your Setup'}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {allStepsComplete ? 'Review and edit your setup.' : 'Finish these steps to start tracking expenses.'}
                      </p>
                    </div>
                    {allStepsComplete && (
                      <button
                        onClick={() => setSetupExpandedForEdits(false)}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Collapse
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Setup Steps */}
                  <div className="space-y-4">
                    {/* Step 1: Add Kids */}
                    <div className={`rounded-lg border p-4 ${stepCompletion.kids ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
                      <button
                        onClick={() => toggleSection('kids')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.kids ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            {stepCompletion.kids ? (
                              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">1</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-medium ${stepCompletion.kids ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {stepCompletion.kids ? `Kids: ${children.map(c => c.name).join(', ')}` : 'Add your kids'}
                            </h3>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${isSectionExpanded('kids') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isSectionExpanded('kids') && (
                        <div className="mt-4 ml-12">
                          {stepCompletion.kids ? (
                            <Link
                              href="/settings/children"
                              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
                            >
                              Edit kids
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                          ) : (
                            <>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Add your kids to track expenses by kid.
                              </p>
                              <Link
                                href="/settings/children"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                              >
                                Add kids
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Recurring Expenses */}
                    <div className={`rounded-lg border p-4 ${stepCompletion.recurring ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
                      <button
                        onClick={() => toggleSection('recurring')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.recurring ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            {stepCompletion.recurring ? (
                              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">2</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${stepCompletion.recurring ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {stepCompletion.recurring ? `${fixedExpenses.length} recurring expense${fixedExpenses.length > 1 ? 's' : ''} set up` : 'Set up recurring expenses'}
                            </h3>
                            {!stepCompletion.recurring && (
                              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">Optional</span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${isSectionExpanded('recurring') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isSectionExpanded('recurring') && (
                        <div className="mt-4 ml-12">
                          {stepCompletion.recurring ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                {fixedExpenses.map(e => e.description).join(', ')}
                              </span>
                              <Link
                                href="/settings/fixed-expenses"
                                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
                              >
                                Edit
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Automatically track regular monthly expenses like tuition or childcare.
                              </p>
                              <Link
                                href="/settings/fixed-expenses"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                              >
                                Set up recurring expenses
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 3: Invite Co-parent */}
                    <div className={`rounded-lg border p-4 ${stepCompletion.coparent ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'}`}>
                      <button
                        onClick={() => toggleSection('coparent')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.coparent ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
                            {stepCompletion.coparent ? (
                              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">3</span>
                            )}
                          </div>
                          <h3 className={`font-medium ${stepCompletion.coparent ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                            {stepCompletion.coparent ? 'Co-parent joined' : 'Invite your co-parent'}
                          </h3>
                        </div>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${isSectionExpanded('coparent') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isSectionExpanded('coparent') && (
                        <div className="mt-4 ml-12">
                          {stepCompletion.coparent ? (
                            <p className="text-sm text-emerald-700 dark:text-emerald-400">
                              Your co-parent has joined the family.
                            </p>
                          ) : (
                            <>
                              <p className="text-sm text-amber-700 dark:text-amber-400">
                                Send an invitation.
                              </p>
                              {isParentA && (
                                <div className="mt-3 space-y-3">
                                  {/* Pending Invites */}
                                  {pendingInvites.length > 0 && (
                                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">
                                        Pending Invite{pendingInvites.length > 1 ? 's' : ''}
                                      </p>
                                      {pendingInvites.map((invite) => (
                                        <div key={invite.id} className="flex items-center justify-between gap-3 py-1">
                                          <span className="text-sm text-blue-800 dark:text-blue-200">{invite.invited_email}</span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleCancelInvite(invite.id); }}
                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Success/Feedback Messages */}
                                  {inviteSuccess && (
                                    <div className="flex items-center gap-2 rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                                      <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Invite shared!</p>
                                    </div>
                                  )}
                                  {copyLinkSuccess && !inviteSuccess && (
                                    <div className="flex items-center gap-2 rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                                      <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Invite link copied!</p>
                                    </div>
                                  )}
                                  {inviteError && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                                  )}

                                  {/* Share Invite Button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleShareInvite(); }}
                                    disabled={isGeneratingInvite}
                                    className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isGeneratingInvite ? (
                                      'Preparing invite...'
                                    ) : (
                                      <>
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                        Invite Co-Parent
                                      </>
                                    )}
                                  </button>

                                  {/* Code Fallback */}
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!showCodeFallback && !inviteCode) {
                                        await handleGenerateInvite();
                                      }
                                      setShowCodeFallback(!showCodeFallback);
                                    }}
                                    disabled={isGeneratingInvite}
                                    className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 disabled:opacity-50"
                                  >
                                    {isGeneratingInvite ? 'Loading...' : (showCodeFallback ? 'Hide invite code' : 'Or share code manually')}
                                  </button>
                                  {showCodeFallback && inviteCode && (
                                    <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        Your co-parent can enter this code at the &quot;Join a Family&quot; page.
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-lg tracking-widest text-center border dark:bg-slate-900 dark:text-slate-100">
                                          {inviteCode}
                                        </code>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleCopyInvite(); }}
                                          className="rounded bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                                        >
                                          {copySuccess ? 'Copied!' : 'Copy'}
                                        </button>
                                      </div>
                                      {inviteExpiresAt && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono">
                                          Expires {new Date(inviteExpiresAt).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!isParentA && (
                                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                                  Waiting for the family creator to send an invite.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 4: Set Split Ratio */}
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                      <button
                        onClick={() => toggleSection('split')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-emerald-800 dark:text-emerald-300">
                            Split ratio set ({Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}% / {Math.round((1 - (meData?.family?.parent_a_ratio || 0.5)) * 100)}%)
                          </h3>
                        </div>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${isSectionExpanded('split') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isSectionExpanded('split') && (
                        <div className="mt-4 ml-12">
                          {isEditingSplitRatio ? (
                            <div className="space-y-4">
                              {/* Slider */}
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={splitRatioA}
                                  onChange={(e) => setSplitRatioA(Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full h-2 rounded-lg cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-700 dark:text-emerald-400">
                                    You: {splitRatioA}%
                                  </span>
                                  <span className="text-emerald-700 dark:text-emerald-400">
                                    Co-parent: {100 - splitRatioA}%
                                  </span>
                                </div>
                              </div>
                              {/* Number inputs */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-emerald-600 dark:text-emerald-500 mb-1">You</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={splitRatioA}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                      setSplitRatioA(val);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-emerald-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <span className="text-emerald-600 dark:text-emerald-400 mt-5">/</span>
                                <div className="flex-1">
                                  <label className="block text-xs text-emerald-600 dark:text-emerald-500 mb-1">Co-parent</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={100 - splitRatioA}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                      setSplitRatioA(100 - val);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-emerald-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveSplitRatio(); }}
                                  disabled={isSavingSplitRatio}
                                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {isSavingSplitRatio ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelSplitRatio(); }}
                                  disabled={isSavingSplitRatio}
                                  className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditSplitRatio(); }}
                              className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors group"
                            >
                              <span className="font-medium font-mono">
                                {Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}% / {Math.round((1 - (meData?.family?.parent_a_ratio || 0.5)) * 100)}%
                              </span>
                              <svg className="h-4 w-4 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions during setup - always show Add Expense */}
            <div className="mt-8">
              <Link
                href="/expenses/add"
                className="flex items-center gap-4 rounded-lg border-2 border-slate-900 bg-slate-900 p-5 text-white transition-colors hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 dark:bg-slate-900/20">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Add Expense</h4>
                  <p className="text-sm opacity-80">You can start adding expenses now</p>
                </div>
              </Link>
            </div>
          </>
        )}

        {/* Setup Complete - Show Streamlined Dashboard */}
        {syncStatus === "synced" && hasFamily && isSetupComplete && (
          <>
            {/* Balance Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                Balance
              </h3>
              {isLoadingBalance ? (
                <p className="text-sm text-slate-500">Calculating balance...</p>
              ) : balance ? (
                <div>
                  {balance.balance_cents === 0 ? (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">Settled Up!</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        No balance between you and your co-parent
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(balance.balance_cents)}
                      </p>
                      <p className="text-lg mt-2">
                        {balance.payer_id === user?.id ? (
                          <span className="text-red-600 dark:text-red-400">
                            You owe
                          </span>
                        ) : (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            You are owed
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Expenses</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(balance.breakdown.total_expenses_cents)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {balance.breakdown.included_expenses_count} expense{balance.breakdown.included_expenses_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your Share</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(isParentA ? balance.breakdown.a_share_cents : balance.breakdown.b_share_cents)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {Math.round((isParentA ? (meData?.family?.parent_a_ratio || 0.5) : (1 - (meData?.family?.parent_a_ratio || 0.5))) * 100)}% of total
                        </p>
                      </div>
                    </div>
                    {balance.breakdown.questioned_count > 0 && (
                      <div className="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                            {balance.breakdown.questioned_count} questioned (<span className="font-mono">{formatCurrency(balance.breakdown.questioned_total_cents)}</span>)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No balance data available</p>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/expenses/add"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Expense
              </Link>
              <Link
                href="/payments/add"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Record Payment
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                All Expenses
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Payment History
              </Link>
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Feed
              </Link>
              <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
              <Link
                href="/settings/children"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Kids
              </Link>
              <Link
                href="/settings/fixed-expenses"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring Expenses
              </Link>
            </div>

            {/* Needs Attention Section */}
            {attentionExpenses.length > 0 && (
              <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="border-l-4 border-amber-400 p-4 dark:border-amber-500">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Needs Attention ({attentionExpenses.length})
                      </h3>
                    </div>
                    <Link
                      href="/expenses?status=questioned"
                      className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-amber-200 dark:divide-amber-800">
                    {attentionExpenses.slice(0, 3).map((expense) => (
                      <Link
                        key={expense.id}
                        href={`/expenses/${expense.id}`}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-amber-900 dark:text-amber-100">
                              {expense.description}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(expense.status)}`}>
                              {expense.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400 font-mono">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="ml-4 shrink-0 text-sm font-semibold text-amber-900 dark:text-amber-100 font-mono">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Expenses Section */}
            <div className="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Recent Expenses
                </h3>
                <Link
                  href="/expenses"
                  className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  View All
                </Link>
              </div>

              {isLoadingExpenses && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-slate-500">Loading expenses...</p>
                </div>
              )}

              {!isLoadingExpenses && expenses.length === 0 && (
                <div className="px-6 pb-6 py-8 text-center">
                  <p className="text-slate-600 dark:text-slate-400">No expenses yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add your first expense to get started</p>
                </div>
              )}

              {!isLoadingExpenses && expenses.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {expense.description}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(expense.status)}`}>
                            {expense.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatCategory(expense.category)}</span>
                          <span className="font-mono">{new Date(expense.expense_date).toLocaleDateString()}</span>
                          <span>{expense.paid_by === user?.id ? "You paid" : "Partner paid"}</span>
                        </div>
                      </div>
                      <p className={`ml-4 shrink-0 font-semibold font-mono ${expense.amount_cents < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {expense.amount_cents < 0 ? "-" : ""}
                        {formatCurrency(Math.abs(expense.amount_cents))}
                      </p>
                    </Link>
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
