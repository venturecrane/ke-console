"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getMe, getPayments, type MeResponse, type Payment } from "@/lib/api";

const ITEMS_PER_PAGE = 20;

// Format cents to dollars display
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export default function PaymentListPage() {
  const { user, isLoaded } = useUser();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalPayments, setTotalPayments] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  const fetchPayments = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await getPayments(
          user.id,
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
    [user, meData?.family]
  );

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await getMe(user.id);
        setMeData(data);
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    }

    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  // Fetch payments when user data is available
  useEffect(() => {
    if (meData?.family) {
      fetchPayments(0, false);
    }
  }, [meData?.family, fetchPayments]);

  const handleLoadMore = () => {
    fetchPayments(currentOffset, true);
  };

  const hasMore = currentOffset < totalPayments;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Payments
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/payments/add"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Record Payment
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Info Card */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Payments are records of money you paid to your co-parent (via Venmo, Zelle, cash, etc.).
            Recording a payment reduces your balance owed.
          </p>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
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
            <p className="text-slate-500">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
              No payments recorded
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Record your first payment when you settle up with your co-parent
            </p>
            <Link
              href="/payments/add"
              className="mt-4 inline-block rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Record First Payment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400"
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
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {payment.paid_by === user?.id ? "You paid" : "Partner paid"}
                        </p>
                        <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {payment.notes && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 pl-10">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold font-mono text-green-600 dark:text-green-400">
                      {formatCurrency(payment.amount_cents)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
