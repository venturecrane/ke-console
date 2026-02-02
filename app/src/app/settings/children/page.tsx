"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  getChildren,
  createChild,
  deleteChild,
  type MeResponse,
  type Child,
} from "@/lib/api";

export default function ChildrenSettingsPage() {
  const { user, isLoaded } = useUser();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add child form
  const [newChildName, setNewChildName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete state
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user || !meData?.family) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getChildren(user.id, meData.family.id);
      setChildren(data.children);
    } catch (err) {
      console.error("Failed to fetch children:", err);
      setError("Failed to load children. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, meData?.family]);

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const data = await getMe(user.id);
        setMeData(data);
      } catch (err) {
        console.error("Failed to load user data:", err);
        setError("Failed to load user data. Please try again.");
      }
    }

    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  // Fetch children when user data is loaded
  useEffect(() => {
    if (meData?.family) {
      fetchChildren();
    }
  }, [meData?.family, fetchChildren]);

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !meData?.family) return;

    const trimmedName = newChildName.trim();
    if (!trimmedName) {
      setAddError("Please enter a name");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const newChild = await createChild(user.id, meData.family.id, trimmedName);
      setChildren((prev) => [...prev, newChild]);
      setNewChildName("");
    } catch (err) {
      console.error("Failed to add child:", err);
      setAddError(err instanceof Error ? err.message : "Failed to add child");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteChild(childId: string) {
    if (!user || !meData?.family) return;

    setDeletingChildId(childId);

    try {
      await deleteChild(user.id, meData.family.id, childId);
      setChildren((prev) => prev.filter((c) => c.id !== childId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete child:", err);
      setError(err instanceof Error ? err.message : "Failed to delete child");
    } finally {
      setDeletingChildId(null);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!meData?.family) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Manage Kids
              </h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-zinc-600 dark:text-zinc-400">
              You need to create or join a family first.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Manage Kids
            </h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Add Child Form */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Add a Kid
          </h2>
          <form onSubmit={handleAddChild} className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newChildName}
                onChange={(e) => {
                  setNewChildName(e.target.value);
                  setAddError(null);
                }}
                placeholder="Kid's name"
                maxLength={100}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {addError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {addError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isAdding || !newChildName.trim()}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isAdding ? "Adding..." : "Add Kid"}
            </button>
          </form>
        </div>

        {/* Children List */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Kids ({children.length})
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Add kids to tag expenses to specific family members.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-zinc-500">Loading kids...</p>
            </div>
          ) : children.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg
                  className="h-6 w-6 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">No kids added yet</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add your kids above to tag expenses to them.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {children.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                        {child.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {child.name}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Added {new Date(child.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {showDeleteConfirm === child.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Delete?
                      </span>
                      <button
                        onClick={() => handleDeleteChild(child.id)}
                        disabled={deletingChildId === child.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingChildId === child.id ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        disabled={deletingChildId === child.id}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(child.id)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      title="Delete kid"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Note about deleted kids
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                When you delete a kid, they are hidden from this list but preserved for historical expense records. Any expenses tagged to a deleted kid will still show that association.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
