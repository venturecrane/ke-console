import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";

export default async function Home() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg px-4">
      <main className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-ke-primary sm:text-5xl">
          The shared ledger for co-parents.
        </h1>
        <p className="mb-12 text-lg text-ke-secondary">
          A neutral space to track shared costs. No guesswork, no arguments — just clear numbers.
        </p>

        <div className="mb-12 w-full max-w-lg space-y-3">
          <div className="border-l-2 border-ke-accent/60 pl-4 py-2">
            <p className="text-sm text-ke-secondary">
              Log expenses with category, date, and receipt link
            </p>
          </div>
          <div className="border-l-2 border-ke-accent/60 pl-4 py-2">
            <p className="text-sm text-ke-secondary">
              Recurring expenses post automatically each month
            </p>
          </div>
          <div className="border-l-2 border-ke-accent/60 pl-4 py-2">
            <p className="text-sm text-ke-secondary">
              Configurable split ratios with full audit trail
            </p>
          </div>
          <div className="border-l-2 border-ke-accent/60 pl-4 py-2">
            <p className="text-sm text-ke-secondary">
              Running balance calculated to the cent
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary" size="lg" className="px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
