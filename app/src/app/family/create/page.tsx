"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createFamily } from "@/lib/api";

export default function CreateFamilyPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createFamily(user.id, familyName || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create family");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Create Your Family
            </h1>
          </div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Set up a shared expense ledger with your co-parent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-6">
            <label
              htmlFor="familyName"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Family Name (optional)
            </label>
            <input
              type="text"
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g., Smith Family"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            />
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You can leave this blank and add it later
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Family"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an invite code?{" "}
            <Link
              href="/family/join"
              className="font-medium text-slate-900 hover:underline dark:text-slate-100"
            >
              Join a family
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
