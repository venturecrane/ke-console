"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type { MeResponse, Payment, SubscriptionResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/statusColors";
import { Button, Card, EmptyState, Alert, UpgradeModal } from "@/components/ui";

const ITEMS_PER_PAGE = 20;

export default function PaymentListPage() {
  const { user, isLoaded } = useUser();
  const api = useApi();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalPayments, setTotalPayments] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  // CSV Export state
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchPayments = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await api.getPayments(
          meData.family.id,
          ITEMS_PER_PAGE,
          offset
        );

        if (append) {
          setPayments((prev) => [...prev, ...data.payments]);
        } else {
          setPayments(data.payments);
        }
        setTotalPayments(data.pagination.total);
        setCurrentOffset(offset + data.payments.length);
      } catch (error) {
        console.error("Failed to fetch payments:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, meData?.family, api]
  );

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await api.getMe();
        setMeData(data);
        if (data.family) {
          try {
            const sub = await api.getSubscription(data.family.id);
            setSubscription(sub);
          } catch {
            // Non-critical
          }
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    }

    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user, api]);

  // Fetch payments when user data is available
  useEffect(() => {
    if (meData?.family) {
      fetchPayments(0, false);
    }
  }, [meData?.family, fetchPayments]);

  const handleLoadMore = () => {
    fetchPayments(currentOffset, true);
  };

  async function handleExportCsv() {
    if (!meData?.family) return;

    if (subscription && subscription.plan !== "pro") {
      setShowUpgradeModal(true);
      return;
    }

    setIsExporting(true);
    try {
      const blob = await api.exportPaymentsCsv(meData.family.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setIsExporting(false);
    }
  }

  const hasMore = currentOffset < totalPayments;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-ke-muted hover:text-ke-secondary"
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
            <h1 className="text-xl font-semibold text-ke-primary">
              Payments
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Link href="/payments/add">
              <Button size="sm">Record Payment</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Info Card */}
        <Alert variant="info" className="mb-6">
          Payments are records of money you paid to your co-parent (via Venmo, Zelle, cash, etc.).
          Recording a payment reduces your balance owed.
        </Alert>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-ke-muted">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              Showing {payments.length} of {totalPayments} payment{totalPayments !== 1 ? "s" : ""}
            </>
          )}
        </div>

        {/* Payment List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-ke-muted">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Record your first payment when you settle up with your co-parent"
            action={
              <Link href="/payments/add">
                <Button>Record First Payment</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ke-status-posted-bg">
                        <svg
                          className="w-4 h-4 text-ke-positive"
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
                      </span>
                      <div>
                        <p className="font-medium text-ke-primary">
                          {payment.paid_by === user?.id ? "You paid" : "Partner paid"}
                        </p>
                        <p className="text-sm font-mono text-ke-muted">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {payment.notes && (
                      <p className="mt-2 text-sm text-ke-muted pl-10">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold font-mono text-ke-positive">
                      {formatCurrency(payment.amount_cents)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Export Requires Pro"
        description="CSV export is a Pro feature. Upgrade to download your payment data."
      />
    </div>
  );
}
