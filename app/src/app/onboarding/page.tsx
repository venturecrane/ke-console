"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  getMe,
  getChildren,
  createChild,
  updateFamily,
  generateInviteCode,
  type MeResponse,
  type Child,
} from "@/lib/api";

type WizardStep = "syncing" | "welcome" | "children" | "split" | "invite";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("syncing");
  const [syncError, setSyncError] = useState(false);
  const [meData, setMeData] = useState<MeResponse | null>(null);

  // Children step state
  const [childName, setChildName] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childError, setChildError] = useState<string | null>(null);

  // Split ratio step state
  const [splitMode, setSplitMode] = useState<"even" | "custom">("even");
  const [splitRatioA, setSplitRatioA] = useState(50);
  const [isSavingSplit, setIsSavingSplit] = useState(false);

  // Invite step state
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteShared, setInviteShared] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const syncAndLoad = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setSyncError(true);
        return;
      }

      const data = await getMe(user.id);
      setMeData(data);

      // Check if onboarding already completed
      const onboardingComplete =
        typeof window !== "undefined" &&
        localStorage.getItem("ke-onboarding-complete") === "true";

      if (onboardingComplete || !data.family) {
        // No family = redirect to dashboard (they need to create/join first)
        // Onboarding complete = go straight to dashboard
        router.push("/dashboard");
        return;
      }

      // Check if user already has children (returning user)
      const childrenData = await getChildren(user.id, data.family.id);
      if (childrenData.children.length > 0) {
        // Already set up, mark complete and go to dashboard
        localStorage.setItem("ke-onboarding-complete", "true");
        router.push("/dashboard");
        return;
      }

      setStep("welcome");
    } catch {
      setSyncError(true);
    }
  }, [user, router]);

  useEffect(() => {
    if (isLoaded && user) {
      syncAndLoad();
    }
  }, [isLoaded, user, syncAndLoad]);

  async function handleAddChild() {
    if (!user || !meData?.family || !childName.trim()) return;

    setIsAddingChild(true);
    setChildError(null);

    try {
      const newChild = await createChild(user.id, meData.family.id, childName.trim());
      setChildren((prev) => [...prev, newChild]);
      setChildName("");
    } catch (err) {
      setChildError(err instanceof Error ? err.message : "Failed to add child");
    } finally {
      setIsAddingChild(false);
    }
  }

  async function handleSaveSplit() {
    if (!user || !meData?.family) return;

    setIsSavingSplit(true);
    try {
      const ratio = splitMode === "even" ? 0.5 : splitRatioA / 100;
      await updateFamily(user.id, meData.family.id, { parentARatio: ratio });
      setStep("invite");
    } catch {
      // Silently continue - default ratio is fine
      setStep("invite");
    } finally {
      setIsSavingSplit(false);
    }
  }

  async function handleShareInvite() {
    if (!user || !meData?.family) return;

    setIsGeneratingInvite(true);
    try {
      let code = inviteCode;
      if (!code) {
        const result = await generateInviteCode(user.id, meData.family.id);
        code = result.inviteCode;
        setInviteCode(code);
      }

      const shareUrl = `${window.location.origin}/family/join?code=${code}`;

      if (navigator.share) {
        await navigator.share({
          title: "Join me on KidExpenses",
          text: "Join me on KidExpenses to track our shared kid expenses together.",
          url: shareUrl,
        });
        setInviteShared(true);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        // Generate code for manual copy fallback
        if (!inviteCode) {
          try {
            const result = await generateInviteCode(user.id, meData.family.id);
            setInviteCode(result.inviteCode);
          } catch {
            // ignore
          }
        }
      }
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  function handleFinish() {
    localStorage.setItem("ke-onboarding-complete", "true");
    router.push("/dashboard");
  }

  // Syncing / error states
  if (!isLoaded || step === "syncing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          {syncError ? (
            <>
              <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Welcome to Kid Expenses
              </h1>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                There was a problem setting up your account. Please try again.
              </p>
              <button
                onClick={() => {
                  setSyncError(false);
                  setStep("syncing");
                  syncAndLoad();
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Setting up your account...
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Please wait while we prepare everything for you.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md">
        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
                KE
              </div>
            </div>
            <h1 className="mb-2 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              Set Up Your Family Ledger
            </h1>
            <p className="mb-8 text-center text-slate-600 dark:text-slate-400">
              A neutral space to track shared costs. Setup takes about 2 minutes.
            </p>
            <button
              onClick={() => setStep("children")}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Start Setup
            </button>
          </div>
        )}

        {/* Step 1: Add Children */}
        {step === "children" && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Step 1 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Add Your Children
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Add at least one child to tag expenses to.
            </p>

            {/* Added children list */}
            {children.length > 0 && (
              <div className="mb-4 space-y-2">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {child.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add child input */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={childName}
                onChange={(e) => {
                  setChildName(e.target.value);
                  setChildError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChild();
                  }
                }}
                placeholder="Child's name"
                maxLength={100}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <button
                onClick={handleAddChild}
                disabled={isAddingChild || !childName.trim()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isAddingChild ? "..." : "+ Add"}
              </button>
            </div>

            {childError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{childError}</p>
            )}

            <button
              onClick={() => setStep("split")}
              disabled={children.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Split Ratio */}
        {step === "split" && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Step 2 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Expense Split Ratio
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              How should shared expenses be divided? This can be adjusted per expense later.
            </p>

            {/* Toggle */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => {
                  setSplitMode("even");
                  setSplitRatioA(50);
                }}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  splitMode === "even"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                50 / 50
              </button>
              <button
                onClick={() => setSplitMode("custom")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  splitMode === "custom"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom slider */}
            {splitMode === "custom" && (
              <div className="mb-6 space-y-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitRatioA}
                  onChange={(e) => setSplitRatioA(Number(e.target.value))}
                  className="w-full h-2 rounded-lg cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    You: {splitRatioA}%
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    Co-parent: {100 - splitRatioA}%
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveSplit}
              disabled={isSavingSplit}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSavingSplit ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 3: Invite Co-parent */}
        {step === "invite" && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Step 3 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Invite Co-parent
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Send a secure link to share this ledger and start tracking together.
            </p>

            {inviteShared ? (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Invite shared successfully!
                </p>
              </div>
            ) : copySuccess ? (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Invite link copied to clipboard!
                </p>
              </div>
            ) : null}

            {/* Invite code display */}
            {inviteCode && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Invite code</p>
                <p className="font-mono text-2xl tracking-widest text-slate-900 dark:text-slate-100">
                  {inviteCode}
                </p>
              </div>
            )}

            <button
              onClick={handleShareInvite}
              disabled={isGeneratingInvite}
              className="mb-3 w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGeneratingInvite ? "Preparing..." : "Share Invite Link"}
            </button>

            <button
              onClick={handleFinish}
              className="w-full py-2 text-center text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
