"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [syncStatus, setSyncStatus] = useState<"pending" | "synced" | "error">(
    "pending"
  );

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
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

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
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Welcome, {user?.firstName || "there"}!
          </h2>
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Your account is set up and ready to use.
          </p>
          {syncStatus === "pending" && (
            <p className="text-sm text-zinc-500">Syncing your account...</p>
          )}
          {syncStatus === "synced" && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Account synced successfully.
            </p>
          )}
          {syncStatus === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to sync account. Please refresh the page.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Next Steps
          </h3>
          <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Create or join a family to start tracking expenses
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Add your first expense
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Invite your co-parent to join
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
