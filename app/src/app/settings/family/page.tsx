"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type { MeResponse } from "@/lib/api";
import { Button, Card, CardBody, Alert } from "@/components/ui";

export default function FamilySettingsPage() {
  const { user, isLoaded } = useUser();
  const api = useApi();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Split ratio state
  const [splitMode, setSplitMode] = useState<"even" | "custom">("even");
  const [sliderValue, setSliderValue] = useState(50);
  const [savedRatio, setSavedRatio] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMe();
      setMeData(data);

      if (data.family) {
        const ratioPercent = Math.round(data.family.parent_a_ratio * 100);
        setSliderValue(ratioPercent);
        setSavedRatio(ratioPercent);
        setSplitMode(ratioPercent === 50 ? "even" : "custom");
      }
    } catch (err) {
      console.error("Failed to fetch family data:", err);
      setError("Failed to load family settings.");
    } finally {
      setIsLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (isLoaded && user) fetchData();
  }, [isLoaded, user, fetchData]);

  const hasChanges = sliderValue !== savedRatio;

  const handleSave = async () => {
    if (!meData?.family || !hasChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      await api.updateFamily(meData.family.id, {
        parentARatio: sliderValue / 100,
      });
      setSavedRatio(sliderValue);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update split ratio:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const parentALabel = meData?.family?.parent_a_id === user?.id ? "You" : "Co-parent";
  const parentBLabel = meData?.family?.parent_a_id === user?.id ? "Co-parent" : "You";

  if (!isLoaded || isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-ke-elevated" />
          <div className="h-40 rounded-xl bg-ke-elevated" />
        </div>
      </div>
    );
  }

  if (!meData?.family) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Alert variant="attention">No family found. Complete onboarding first.</Alert>
        <Link href="/onboarding" className="mt-4 inline-block text-ke-accent hover:underline">
          Go to Onboarding
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-ke-secondary hover:bg-ke-elevated"
          aria-label="Back to dashboard"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-ke-primary">Family Settings</h1>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert variant="success" className="mb-4">
          Split ratio updated. Changes apply to future expenses only.
        </Alert>
      )}

      {/* Split Ratio Card */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-1 text-lg font-semibold text-ke-primary">
            Expense Split Ratio
          </h2>
          <p className="mb-5 text-sm text-ke-secondary">
            How shared expenses are divided between parents. Changes apply to future expenses only — existing expenses keep their original split.
          </p>

          {/* Mode toggle */}
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => {
                setSplitMode("even");
                setSliderValue(50);
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

          {/* Slider */}
          {splitMode === "custom" && (
            <div className="mb-5 space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-lg accent-[var(--color-ke-accent)]"
                aria-label="Split ratio slider"
              />
              {/* Percentage labels */}
              <div className="flex justify-between text-xs text-ke-muted">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Real-time preview */}
          <div className="rounded-lg border border-ke-border bg-ke-elevated/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-ke-primary">{parentALabel}</span>
              <span className="font-mono text-lg font-bold text-ke-accent">
                {sliderValue}%
              </span>
            </div>
            {/* Visual bar */}
            <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-ke-border">
              <div
                className="rounded-l-full bg-ke-accent transition-all duration-150"
                style={{ width: `${sliderValue}%` }}
              />
              <div
                className="rounded-r-full bg-ke-secondary/30 transition-all duration-150"
                style={{ width: `${100 - sliderValue}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ke-primary">{parentBLabel}</span>
              <span className="font-mono text-lg font-bold text-ke-secondary">
                {100 - sliderValue}%
              </span>
            </div>

            {/* Example calculation */}
            <div className="mt-4 border-t border-ke-border pt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ke-muted">
                Example: $100 expense
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-ke-secondary">
                  {parentALabel}: <span className="font-mono font-semibold text-ke-primary">${(sliderValue).toFixed(2)}</span>
                </span>
                <span className="text-ke-secondary">
                  {parentBLabel}: <span className="font-mono font-semibold text-ke-primary">${(100 - sliderValue).toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-5">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              fullWidth
            >
              {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
            </Button>
            {hasChanges && (
              <p className="mt-2 text-center text-xs text-ke-muted">
                Current: {savedRatio}% / {100 - savedRatio}% → New: {sliderValue}% / {100 - sliderValue}%
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Family info card */}
      <Card>
        <CardBody>
          <h2 className="mb-3 text-lg font-semibold text-ke-primary">Family Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ke-secondary">Family Name</dt>
              <dd className="font-medium text-ke-primary">{meData.family.name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ke-secondary">Family ID</dt>
              <dd className="font-mono text-xs text-ke-muted">{meData.family.id}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
