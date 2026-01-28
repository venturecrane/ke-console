"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    async function syncAndRedirect() {
      if (!user) return;

      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // Redirect to dashboard after successful sync
          router.push("/dashboard");
        } else {
          console.error("Failed to sync user");
          setSyncing(false);
        }
      } catch (error) {
        console.error("Error syncing user:", error);
        setSyncing(false);
      }
    }

    if (isLoaded && user) {
      syncAndRedirect();
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || syncing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Setting up your account...
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Please wait while we prepare everything for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Welcome to Kid Expenses
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          There was a problem setting up your account. Please try again.
        </p>
        <button
          onClick={() => {
            setSyncing(true);
            window.location.reload();
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
