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
          const [expenseData, balanceData, invitesData, childrenData, fixedExpenseData] = await Promise.all([
            getExpenses(user.id, data.family.id, { limit: 5 }),
            getBalance(user.id, data.family.id),
            // Only fetch pending invites if user is parent_a and no parent_b
            data.family.parent_b_id === null
              ? getPendingInvites(user.id, data.family.id)
              : Promise.resolve({ invites: [] }),
            getChildren(user.id, data.family.id),
            getFixedExpenses(user.id, data.family.id),
          ]);
          setExpenses(expenseData.expenses);
          setBalance(balanceData);
          setPendingInvites(invitesData.invites.filter(i => !i.is_expired));
          setChildren(childrenData.children);
          setFixedExpenses(fixedExpenseData.fixedExpenses);
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
          title: 'Join KidExpenses',
          text: 'Track our shared kid expenses together',
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
        parent_a_ratio: splitRatioA / 100,
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
        <p className="text-zinc-500">Loading...</p>
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Kid Expenses
            </h1>
            {isSetupComplete && meData?.family?.name && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {meData.family.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Loading/Error State */}
        {syncStatus === "pending" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">Loading your data...</p>
          </div>
        )}
        {syncStatus === "error" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load data. Please refresh the page.
            </p>
          </div>
        )}

        {/* No Family - Show Welcome and Create/Join Options */}
        {syncStatus === "synced" && !hasFamily && (
          <>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Welcome, {user?.firstName || "there"}!
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Get started by creating a family or joining one with an invite
                code.
              </p>
            </div>
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
          </>
        )}

        {/* Has Family but Setup NOT Complete - Show Setup Wizard */}
        {syncStatus === "synced" && hasFamily && !isSetupComplete && (
          <>
            {/* Setup Wizard Card */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              {allStepsComplete && !setupExpandedForEdits ? (
                /* All steps complete - minimal state */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-green-800 dark:text-green-300">
                        Setup Complete
                      </h2>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        All steps finished. You&apos;re ready to track expenses!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSetupExpandedForEdits(true)}
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                      <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        {allStepsComplete ? 'Setup Settings' : 'Complete Your Setup'}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {allStepsComplete ? 'Review and edit your setup.' : 'Finish these steps to start tracking expenses with your co-parent.'}
                      </p>
                    </div>
                    {allStepsComplete && (
                      <button
                        onClick={() => setSetupExpandedForEdits(false)}
                        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                    <div className={`rounded-lg border p-4 ${stepCompletion.kids ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'}`}>
                      <button
                        onClick={() => toggleSection('kids')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.kids ? 'bg-green-100 dark:bg-green-900/50' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                            {stepCompletion.kids ? (
                              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">1</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-medium ${stepCompletion.kids ? 'text-green-800 dark:text-green-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {stepCompletion.kids ? `Kids: ${children.map(c => c.name).join(', ')}` : 'Add your kids'}
                            </h3>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-zinc-400 transition-transform ${isSectionExpanded('kids') ? 'rotate-180' : ''}`}
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
                              className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
                            >
                              Edit kids
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                          ) : (
                            <>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Add your kids to track expenses by kid.
                              </p>
                              <Link
                                href="/settings/children"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
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
                    <div className={`rounded-lg border p-4 ${stepCompletion.recurring ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'}`}>
                      <button
                        onClick={() => toggleSection('recurring')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.recurring ? 'bg-green-100 dark:bg-green-900/50' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                            {stepCompletion.recurring ? (
                              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">2</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${stepCompletion.recurring ? 'text-green-800 dark:text-green-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {stepCompletion.recurring ? `${fixedExpenses.length} recurring expense${fixedExpenses.length > 1 ? 's' : ''} set up` : 'Set up recurring expenses'}
                            </h3>
                            {!stepCompletion.recurring && (
                              <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">Optional</span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-zinc-400 transition-transform ${isSectionExpanded('recurring') ? 'rotate-180' : ''}`}
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
                              <span className="text-sm text-green-700 dark:text-green-400">
                                {fixedExpenses.map(e => e.description).join(', ')}
                              </span>
                              <Link
                                href="/settings/fixed-expenses"
                                className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
                              >
                                Edit
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Automatically track regular monthly expenses like tuition or childcare.
                              </p>
                              <Link
                                href="/settings/fixed-expenses"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
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
                    <div className={`rounded-lg border p-4 ${stepCompletion.coparent ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'}`}>
                      <button
                        onClick={() => toggleSection('coparent')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${stepCompletion.coparent ? 'bg-green-100 dark:bg-green-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
                            {stepCompletion.coparent ? (
                              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">3</span>
                            )}
                          </div>
                          <h3 className={`font-medium ${stepCompletion.coparent ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                            {stepCompletion.coparent ? 'Co-parent joined' : 'Invite your co-parent'}
                          </h3>
                        </div>
                        <svg
                          className={`h-5 w-5 text-zinc-400 transition-transform ${isSectionExpanded('coparent') ? 'rotate-180' : ''}`}
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
                            <p className="text-sm text-green-700 dark:text-green-400">
                              Your co-parent has joined the family.
                            </p>
                          ) : (
                            <>
                              <p className="text-sm text-amber-700 dark:text-amber-400">
                                Send an invitation so you can both track expenses together.
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
                                    <div className="flex items-center gap-2 rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                                      <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Invite shared!</p>
                                    </div>
                                  )}
                                  {copyLinkSuccess && !inviteSuccess && (
                                    <div className="flex items-center gap-2 rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                                      <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Invite link copied!</p>
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
                                    <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                        Your co-parent can enter this code at the &quot;Join a Family&quot; page.
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-lg tracking-widest text-center border dark:bg-zinc-900 dark:text-zinc-100">
                                          {inviteCode}
                                        </code>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleCopyInvite(); }}
                                          className="rounded bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"
                                        >
                                          {copySuccess ? 'Copied!' : 'Copy'}
                                        </button>
                                      </div>
                                      {inviteExpiresAt && (
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
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
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <button
                        onClick={() => toggleSection('split')}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                            <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-green-800 dark:text-green-300">
                            Split ratio set ({Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}% / {Math.round((1 - (meData?.family?.parent_a_ratio || 0.5)) * 100)}%)
                          </h3>
                        </div>
                        <svg
                          className={`h-5 w-5 text-zinc-400 transition-transform ${isSectionExpanded('split') ? 'rotate-180' : ''}`}
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
                                  className="w-full h-2 rounded-lg cursor-pointer accent-green-600"
                                />
                                <div className="flex justify-between text-sm">
                                  <span className="text-green-700 dark:text-green-400">
                                    You: {splitRatioA}%
                                  </span>
                                  <span className="text-green-700 dark:text-green-400">
                                    Co-parent: {100 - splitRatioA}%
                                  </span>
                                </div>
                              </div>
                              {/* Number inputs */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-green-600 dark:text-green-500 mb-1">You</label>
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
                                    className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none dark:border-green-600 dark:bg-zinc-800 dark:text-zinc-100"
                                  />
                                </div>
                                <span className="text-green-600 dark:text-green-400 mt-5">/</span>
                                <div className="flex-1">
                                  <label className="block text-xs text-green-600 dark:text-green-500 mb-1">Co-parent</label>
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
                                    className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none dark:border-green-600 dark:bg-zinc-800 dark:text-zinc-100"
                                  />
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveSplitRatio(); }}
                                  disabled={isSavingSplitRatio}
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {isSavingSplitRatio ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelSplitRatio(); }}
                                  disabled={isSavingSplitRatio}
                                  className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/30"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditSplitRatio(); }}
                              className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 transition-colors group"
                            >
                              <span className="font-medium">
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
                className="flex items-center gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-900 p-5 text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 dark:bg-zinc-900/20">
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
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
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

                  {/* Summary Stats */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Expenses</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(balance.breakdown.total_expenses_cents)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {balance.breakdown.included_expenses_count} expense{balance.breakdown.included_expenses_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Your Share</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(isParentA ? balance.breakdown.a_share_cents : balance.breakdown.b_share_cents)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                            {balance.breakdown.questioned_count} questioned ({formatCurrency(balance.breakdown.questioned_total_cents)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Actions */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    {balance.balance_cents !== 0 && balance.payer_id === user?.id && (
                      <Link
                        href="/payments/add"
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Record Payment
                      </Link>
                    )}
                    <Link
                      href="/payments"
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <svg className="h-4 w-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">View Payment History</span>
                      </div>
                      <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No balance data available</p>
              )}
            </div>

            {/* Primary Actions */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/expenses/add"
                className="flex items-center gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-900 p-5 text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 dark:bg-zinc-900/20">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Add Expense</h4>
                  <p className="text-sm opacity-80">Record a new shared expense</p>
                </div>
              </Link>
              <Link
                href="/payments/add"
                className="flex items-center gap-4 rounded-lg border-2 border-green-600 bg-green-600 p-5 text-white transition-colors hover:bg-green-700 dark:border-green-500 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Record Payment</h4>
                  <p className="text-sm opacity-80">Log a payment to your co-parent</p>
                </div>
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                All Expenses
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Payment History
              </Link>
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Feed
              </Link>
              <span className="mx-1 text-zinc-300 dark:text-zinc-700">|</span>
              <Link
                href="/settings/children"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Kids
              </Link>
              <Link
                href="/settings/fixed-expenses"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring Expenses
              </Link>
            </div>

            {/* Expenses Section */}
            <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Recent Expenses
                </h3>
                <Link
                  href="/expenses"
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  View All
                </Link>
              </div>

              {isLoadingExpenses && (
                <p className="text-sm text-zinc-500">Loading expenses...</p>
              )}

              {!isLoadingExpenses && expenses.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400">No expenses yet</p>
                  <p className="mt-1 text-sm text-zinc-500">Add your first expense to get started</p>
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
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(expense.status)}`}>
                            {expense.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                          <span>{formatCategory(expense.category)}</span>
                          <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${expense.amount_cents < 0 ? "text-green-600 dark:text-green-400" : "text-zinc-900 dark:text-zinc-100"}`}>
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
