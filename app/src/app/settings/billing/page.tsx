"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type { MeResponse, SubscriptionResponse } from "@/lib/api";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Alert,
} from "@/components/ui";

const FEATURE_ROWS: {
  label: string;
  free: string;
  pro: string;
}[] = [
  {
    label: "Recurring expense templates",
    free: "2",
    pro: "Unlimited",
  },
  {
    label: "Expense history",
    free: "90 days",
    pro: "Unlimited",
  },
  {
    label: "Support",
    free: "Community",
    pro: "Priority",
  },
  {
    label: "Analytics",
    free: "--",
    pro: "Coming soon",
  },
];

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const api = useApi();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const me = await api.getMe();
      setMeData(me);

      if (me.family) {
        const sub = await api.getSubscription(me.family.id);
        setSubscription(sub);
      }
    } catch (err) {
      console.error("Failed to load billing data:", err);
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, fetchData]);

  async function handleUpgrade() {
    if (!meData?.family) return;
    setIsUpgrading(true);
    setError(null);

    try {
      const returnUrl = `${window.location.origin}/settings/billing`;
      const result = await api.createCheckoutSession(meData.family.id, returnUrl);
      // Redirect to checkout
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsUpgrading(false);
    }
  }

  async function handleCancel() {
    if (!meData?.family) return;
    setIsCancelling(true);
    setError(null);

    try {
      const result = await api.cancelSubscription(meData.family.id);
      setActionMessage(result.message);
      setShowCancelConfirm(false);
      // Refresh subscription data
      const sub = await api.getSubscription(meData.family.id);
      setSubscription(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ke-bg">
        <p className="text-ke-muted">Loading...</p>
      </div>
    );
  }

  if (!meData?.family) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-ke-primary">Billing</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Card>
            <CardBody className="text-center">
              <p className="text-ke-secondary">
                You need to create or join a family first.
              </p>
              <div className="mt-4">
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </main>
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const isPro = plan === "pro";
  const sub = subscription?.subscription;

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Billing</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Error / Success messages */}
        {error && (
          <Alert variant="error">{error}</Alert>
        )}
        {actionMessage && (
          <Alert variant="success">{actionMessage}</Alert>
        )}

        {/* Current Plan Card */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium text-ke-primary">Current Plan</h2>
                  <Badge variant={isPro ? "success" : "default"}>
                    {isPro ? "Pro" : "Free"}
                  </Badge>
                </div>
                {isPro && sub?.currentPeriodEnd && (
                  <p className="mt-2 text-sm text-ke-muted">
                    {sub.cancelAtPeriodEnd
                      ? `Cancels on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : `Renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                  </p>
                )}
                {isPro && sub?.currentPeriodStart && (
                  <p className="mt-1 text-sm text-ke-muted">
                    Current period started {new Date(sub.currentPeriodStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {!isPro && (
                  <p className="mt-2 text-sm text-ke-muted">
                    Upgrade for unlimited templates and full history.
                  </p>
                )}
              </div>

              {!isPro ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="min-h-[44px]"
                >
                  {isUpgrading ? "Redirecting..." : "Upgrade to Pro -- $5/month"}
                </Button>
              ) : (
                !sub?.cancelAtPeriodEnd && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowCancelConfirm(true)}
                    className="min-h-[44px]"
                  >
                    Cancel Subscription
                  </Button>
                )
              )}
            </div>
          </CardBody>
        </Card>

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <Alert variant="attention">
            <div>
              <p className="font-medium">Cancel your Pro subscription?</p>
              <p className="mt-1 text-sm">
                You&apos;ll keep Pro features until the end of your current billing period.
                After that, your account will revert to the Free plan.
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="min-h-[44px]"
                >
                  {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancelling}
                  className="min-h-[44px]"
                >
                  Keep Pro
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Feature Comparison Table */}
        <Card>
          <CardHeader className="border-b border-ke-border">
            <h2 className="text-lg font-medium text-ke-primary">Plan Comparison</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ke-divider">
                  <th className="px-4 py-3 text-left font-medium text-ke-muted sm:px-6">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-ke-muted sm:px-6">
                    Free
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-ke-muted sm:px-6">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ke-divider">
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 text-ke-primary sm:px-6">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-center text-ke-secondary sm:px-6">
                      {row.free}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-ke-primary sm:px-6">
                      {row.pro}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-3 text-ke-primary sm:px-6">
                    Price
                  </td>
                  <td className="px-4 py-3 text-center text-ke-secondary sm:px-6">
                    $0
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-ke-primary sm:px-6">
                    $5/month
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upgrade CTA for free users */}
        {!isPro && (
          <Card>
            <CardBody className="text-center">
              <h3 className="text-lg font-medium text-ke-primary">
                Ready to upgrade?
              </h3>
              <p className="mt-2 text-sm text-ke-muted">
                Get unlimited recurring templates, full expense history, and priority support.
              </p>
              <div className="mt-4">
                <Button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="min-h-[44px]"
                >
                  {isUpgrading ? "Redirecting..." : "Upgrade to Pro -- $5/month"}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
