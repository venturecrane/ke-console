"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import type {
  MeResponse,
  Child,
} from "@/lib/api";
import { Button, Card, Alert } from "@/components/ui";

type WizardStep = "syncing" | "welcome" | "children" | "split" | "invite";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const api = useApi();
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

      const data = await api.getMe();
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
      const childrenData = await api.getChildren(data.family.id);
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
  }, [user, router, api]);

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
      const newChild = await api.createChild(meData.family.id, childName.trim());
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
      await api.updateFamily(meData.family.id, { parentARatio: ratio });
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
        const result = await api.generateInviteCode(meData.family.id);
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
            const result = await api.generateInviteCode(meData.family.id);
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg">
        <div className="text-center">
          {syncError ? (
            <>
              <h1 className="mb-4 text-2xl font-semibold text-ke-primary">
                Welcome to Kid Expenses
              </h1>
              <p className="mb-6 text-ke-secondary">
                There was a problem setting up your account. Please try again.
              </p>
              <Button
                onClick={() => {
                  setSyncError(false);
                  setStep("syncing");
                  syncAndLoad();
                }}
              >
                Retry
              </Button>
            </>
          ) : (
            <>
              <h1 className="mb-4 text-2xl font-semibold text-ke-primary">
                Setting up your account...
              </h1>
              <p className="text-ke-secondary">
                Please wait while we prepare everything for you.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg px-4 py-8">
      <div className="w-full max-w-md">
        {/* Welcome Step */}
        {step === "welcome" && (
          <Card className="p-8 shadow-sm">
            <div className="mb-6 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ke-accent text-lg font-bold text-ke-inverse">
                KE
              </div>
            </div>
            <h1 className="mb-2 text-center text-2xl font-bold text-ke-primary">
              Set Up Your Family Ledger
            </h1>
            <p className="mb-8 text-center text-ke-secondary">
              A neutral space to track shared costs. Setup takes about 2 minutes.
            </p>
            <Button
              onClick={() => setStep("children")}
              fullWidth
              size="lg"
            >
              Start Setup
            </Button>
          </Card>
        )}

        {/* Step 1: Add Children */}
        {step === "children" && (
          <Card className="p-8 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ke-muted">
              Step 1 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-ke-primary">
              Add Your Children
            </h2>
            <p className="mb-6 text-sm text-ke-secondary">
              Add at least one child to tag expenses to.
            </p>

            {/* Added children list */}
            {children.length > 0 && (
              <div className="mb-4 space-y-2">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 rounded-lg border border-ke-border bg-ke-elevated px-4 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ke-accent/10 text-sm font-medium text-ke-accent">
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-ke-primary">
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
                className="flex-1 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
              />
              <Button
                onClick={handleAddChild}
                disabled={isAddingChild || !childName.trim()}
                variant="secondary"
              >
                {isAddingChild ? "..." : "+ Add"}
              </Button>
            </div>

            {childError && (
              <p className="mb-4 text-sm text-ke-negative">{childError}</p>
            )}

            <Button
              onClick={() => setStep("split")}
              disabled={children.length === 0}
              fullWidth
              size="lg"
            >
              Continue
            </Button>
          </Card>
        )}

        {/* Step 2: Split Ratio */}
        {step === "split" && (
          <Card className="p-8 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ke-muted">
              Step 2 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-ke-primary">
              Expense Split Ratio
            </h2>
            <p className="mb-6 text-sm text-ke-secondary">
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
                    ? "border-ke-accent bg-ke-accent/10 text-ke-accent"
                    : "border-ke-border text-ke-secondary hover:bg-ke-elevated"
                }`}
              >
                50 / 50
              </button>
              <button
                onClick={() => setSplitMode("custom")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  splitMode === "custom"
                    ? "border-ke-accent bg-ke-accent/10 text-ke-accent"
                    : "border-ke-border text-ke-secondary hover:bg-ke-elevated"
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
                  className="w-full h-2 rounded-lg cursor-pointer accent-[var(--color-ke-accent)]"
                />
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-ke-secondary">
                    You: {splitRatioA}%
                  </span>
                  <span className="font-mono text-ke-secondary">
                    Co-parent: {100 - splitRatioA}%
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveSplit}
              disabled={isSavingSplit}
              fullWidth
              size="lg"
            >
              {isSavingSplit ? "Saving..." : "Continue"}
            </Button>
          </Card>
        )}

        {/* Step 3: Invite Co-parent */}
        {step === "invite" && (
          <Card className="p-8 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ke-muted">
              Step 3 of 3
            </p>
            <h2 className="mb-2 text-xl font-bold text-ke-primary">
              Invite Co-parent
            </h2>
            <p className="mb-6 text-sm text-ke-secondary">
              Send a secure link to share this ledger and start tracking together.
            </p>

            {inviteShared ? (
              <Alert variant="success" className="mb-6 text-center">
                <p className="text-sm font-medium">
                  Invite shared successfully!
                </p>
              </Alert>
            ) : copySuccess ? (
              <Alert variant="success" className="mb-6 text-center">
                <p className="text-sm font-medium">
                  Invite link copied to clipboard!
                </p>
              </Alert>
            ) : null}

            {/* Invite code display */}
            {inviteCode && (
              <div className="mb-6 rounded-lg border border-ke-border bg-ke-elevated p-4 text-center">
                <p className="mb-1 text-xs text-ke-muted">Invite code</p>
                <p className="font-mono text-2xl tracking-widest text-ke-primary">
                  {inviteCode}
                </p>
              </div>
            )}

            <Button
              onClick={handleShareInvite}
              disabled={isGeneratingInvite}
              fullWidth
              size="lg"
              className="mb-3"
            >
              {isGeneratingInvite ? "Preparing..." : "Share Invite Link"}
            </Button>

            <button
              onClick={handleFinish}
              className="w-full py-2 text-center text-sm text-ke-muted transition-colors hover:text-ke-primary"
            >
              Skip for now
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
