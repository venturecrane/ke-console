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
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Create Your Family
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Set up a shared expense ledger with your co-parent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-6">
            <label
              htmlFor="familyName"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Family Name (optional)
            </label>
            <input
              type="text"
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g., Smith Family"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Creating..." : "Create Family"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Already have an invite code?{" "}
            <Link
              href="/family/join"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Join a family
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
