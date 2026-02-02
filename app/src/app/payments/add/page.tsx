"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createPayment, getMe, type MeResponse } from "@/lib/api";

export default function AddPaymentPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await getMe(user.id);
        setMeData(data);
        if (!data.family) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
        setError("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded && user) {
      loadUserData();
    } else if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family) return;

    setIsSubmitting(true);
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive amount");
      setIsSubmitting(false);
      return;
    }

    try {
      await createPayment(user.id, meData.family.id, {
        amount: amountNum,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!meData?.family) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-900">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Record Payment
            </h1>
          </div>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Log a payment you made to your co-parent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          {/* Amount */}
          <div className="mb-4">
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Enter the amount you paid via Venmo, Zelle, cash, etc.
            </p>
          </div>

          {/* Date */}
          <div className="mb-4">
            <label
              htmlFor="paymentDate"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="paymentDate"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Notes (optional) */}
          <div className="mb-6">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Venmo transfer, Cash payment..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Recording..." : "Record Payment"}
          </button>
        </form>

      </div>
    </div>
  );
}
