"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  generateInviteCode,
  getExpenses,
  getBalance,
  sendEmailInvite,
  getPendingInvites,
  cancelInvite,
  type MeResponse,
  type Expense,
  type BalanceResponse,
  type PendingInvite,
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
  // Email invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showCodeFallback, setShowCodeFallback] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
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
          const [expenseData, balanceData, invitesData] = await Promise.all([
            getExpenses(user.id, data.family.id, { limit: 5 }),
            getBalance(user.id, data.family.id),
            // Only fetch pending invites if user is parent_a and no parent_b
            data.family.parent_b_id === null
              ? getPendingInvites(user.id, data.family.id)
              : Promise.resolve({ invites: [] }),
          ]);
          setExpenses(expenseData.expenses);
          setBalance(balanceData);
          setPendingInvites(invitesData.invites.filter(i => !i.is_expired));
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

  async function handleSendEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family || !inviteEmail.trim()) return;

    setIsSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const result = await sendEmailInvite(user.id, meData.family.id, inviteEmail.trim());
      setInviteCode(result.inviteCode);
      setInviteLink(result.inviteLink);
      setInviteExpiresAt(result.expiresAt);
      setInviteSuccess(true);
      setInviteEmail("");
      // Refresh pending invites
      const invitesData = await getPendingInvites(user.id, meData.family.id);
      setPendingInvites(invitesData.invites.filter(i => !i.is_expired));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
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

  async function handleCopyLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch {
      console.error("Failed to copy invite link");
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
            {/* Family Card - Compact when fully set up, expanded when action needed */}
            {hasPartner ? (
              // Compact view when both parents are connected
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {meData?.family?.name || "Your Family"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Both parents connected · Split: {Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}/{Math.round((1 - (meData?.family?.parent_a_ratio || 0.5)) * 100)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Expanded view when co-parent needs to be invited
              <div className="mt-8 rounded-lg border-2 border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      Invite your co-parent to join
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Enter their email address and we&apos;ll send them an invitation to join your family.
                    </p>

                    {isParentA && (
                      <div className="mt-4 space-y-4">
                        {/* Pending Invites */}
                        {pendingInvites.length > 0 && (
                          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">
                              Pending Invite{pendingInvites.length > 1 ? 's' : ''}
                            </p>
                            {pendingInvites.map((invite) => (
                              <div key={invite.id} className="flex items-center justify-between gap-3 py-2">
                                <div className="flex items-center gap-2">
                                  <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-sm text-blue-800 dark:text-blue-200">{invite.invited_email}</span>
                                </div>
                                <button
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ))}
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              Waiting for them to accept the invitation
                            </p>
                          </div>
                        )}

                        {/* Success Message */}
                        {inviteSuccess && inviteLink && (
                          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                Invitation sent!
                              </p>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                              You can also share this link directly:
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-green-700 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                              <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                              >
                                {copyLinkSuccess ? (
                                  <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Email Invite Form */}
                        <form onSubmit={handleSendEmailInvite} className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="co-parent@email.com"
                              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                            />
                            <button
                              type="submit"
                              disabled={isSendingInvite || !inviteEmail.trim()}
                              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {isSendingInvite ? "Sending..." : "Send Invite"}
                            </button>
                          </div>

                          {inviteError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                          )}
                        </form>

                        {/* Code Fallback Toggle */}
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                          <button
                            onClick={() => setShowCodeFallback(!showCodeFallback)}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            <svg
                              className={`h-3 w-3 transition-transform ${showCodeFallback ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {showCodeFallback ? 'Hide' : 'Show'} invite code option
                          </button>

                          {showCodeFallback && (
                            <div className="mt-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                              {inviteCode ? (
                                <>
                                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                    Share this code manually
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <code className="flex-1 rounded-lg bg-white px-4 py-3 font-mono text-xl tracking-[0.25em] text-center border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                                      {inviteCode}
                                    </code>
                                    <button
                                      onClick={handleCopyInvite}
                                      className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                      {copySuccess ? (
                                        <>
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {inviteExpiresAt && (
                                        <>Expires {new Date(inviteExpiresAt).toLocaleDateString()}</>
                                      )}
                                    </p>
                                    <button
                                      onClick={handleGenerateInvite}
                                      disabled={isGeneratingInvite}
                                      className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                    >
                                      Generate new code
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  onClick={handleGenerateInvite}
                                  disabled={isGeneratingInvite}
                                  className="flex items-center gap-2 rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  {isGeneratingInvite ? "Generating..." : "Generate Invite Code"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isParentA && (
                      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                        Waiting for the family creator to send you an invite.
                      </p>
                    )}
                  </div>
                </div>

                {/* Split Ratio Info */}
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Current split ratio: <span className="font-medium text-zinc-700 dark:text-zinc-300">{Math.round((meData?.family?.parent_a_ratio || 0.5) * 100)}% / {Math.round((1 - (meData?.family?.parent_a_ratio || 0.5)) * 100)}%</span>
                  </p>
                </div>
              </div>
            )}

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
                  <svg
                    className="h-6 w-6"
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
                  <h4 className="text-lg font-semibold">
                    Add Expense
                  </h4>
                  <p className="text-sm opacity-80">
                    Record a new shared expense
                  </p>
                </div>
              </Link>
              <Link
                href="/payments/add"
                className="flex items-center gap-4 rounded-lg border-2 border-green-600 bg-green-600 p-5 text-white transition-colors hover:bg-green-700 dark:border-green-500 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-6 w-6"
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
                  <h4 className="text-lg font-semibold">
                    Record Payment
                  </h4>
                  <p className="text-sm opacity-80">
                    Log a payment to your co-parent
                  </p>
                </div>
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg
                  className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
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
                All Expenses
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg
                  className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Payment History
              </Link>
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <svg
                  className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
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
                Activity Feed
              </Link>
              <span className="mx-1 text-zinc-300 dark:text-zinc-700">|</span>
              <Link
                href="/settings/children"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-4 w-4"
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
                Children
              </Link>
              <Link
                href="/settings/fixed-expenses"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-4 w-4"
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
                Fixed Expenses
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
