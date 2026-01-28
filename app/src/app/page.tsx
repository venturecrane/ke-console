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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <main className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Kid Expenses
        </h1>
        <p className="mb-2 text-xl text-zinc-600 dark:text-zinc-400">
          Simple expense tracking for co-parents
        </p>
        <p className="mb-8 text-lg text-zinc-500 dark:text-zinc-500">
          Stay organized together, effortlessly.
        </p>

        <div className="mb-12 max-w-lg text-zinc-600 dark:text-zinc-400">
          <p className="mb-4">
            A shared space to track child-related expenses. Log costs, set up
            recurring expenses, and always know where things stand.
          </p>
          <ul className="space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Quick and easy expense logging
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Set up recurring expenses once
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Flexible split ratios that work for you
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Clear running balance at a glance
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-8 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-8 font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
