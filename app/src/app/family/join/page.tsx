"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { joinFamily } from "@/lib/api";

function JoinFamilyForm() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill invite code from URL if provided
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await joinFamily(user.id, inviteCode.trim().toUpperCase());
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join family");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <div className="w-full max-w-md">
        {/* App branding */}
        <div className="mb-8 text-center">
          {/* TODO: Replace with logo when available */}
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            KidExpenses
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Shared expense tracking for co-parents
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Join a Family
          </h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Enter the invite code to get started.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-6">
            <label
              htmlFor="inviteCode"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Invite Code
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              maxLength={8}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-center font-mono text-lg tracking-widest text-zinc-900 placeholder-zinc-400 uppercase focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              8-character code provided by your co-parent
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || inviteCode.length !== 8}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Joining..." : "Join Family"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Need to create a new family instead?{" "}
            <Link
              href="/family/create"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Create a family
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function JoinFamilyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <JoinFamilyForm />
    </Suspense>
  );
}
