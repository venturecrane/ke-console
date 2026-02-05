import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <main className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          The shared ledger for co-parents.
        </h1>
        <p className="mb-12 text-lg text-slate-600 dark:text-slate-400">
          A neutral space to track shared costs. No guesswork, no arguments — just clear numbers.
        </p>

        <div className="mb-12 w-full max-w-lg space-y-3">
          <div className="border-l-2 border-indigo-500/60 pl-4 py-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Log expenses with category, date, and receipt link
            </p>
          </div>
          <div className="border-l-2 border-indigo-500/60 pl-4 py-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Recurring expenses post automatically each month
            </p>
          </div>
          <div className="border-l-2 border-indigo-500/60 pl-4 py-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Configurable split ratios with full audit trail
            </p>
          </div>
          <div className="border-l-2 border-indigo-500/60 pl-4 py-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Running balance calculated to the cent
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="flex h-12 items-center justify-center rounded-lg bg-indigo-600 px-8 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="flex h-12 items-center justify-center rounded-lg border border-slate-300 px-8 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
