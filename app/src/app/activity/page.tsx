"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMe,
  getActivity,
  type MeResponse,
  type ActivityEvent,
} from "@/lib/api";

const ITEMS_PER_PAGE = 20;

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Format currency
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

// Get event icon and color based on event type
function getEventStyle(eventType: string): {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
} {
  switch (eventType) {
    case "expense.created":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-600 dark:text-green-400",
      };
    case "expense.edited":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
      };
    case "expense.questioned":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-600 dark:text-yellow-400",
      };
    case "expense.resolved":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-600 dark:text-purple-400",
      };
    case "payment.created":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
        textColor: "text-emerald-600 dark:text-emerald-400",
      };
    case "child.created":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
        bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
        textColor: "text-indigo-600 dark:text-indigo-400",
      };
    case "child.deleted":
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        ),
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-600 dark:text-red-400",
      };
    default:
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: "bg-zinc-100 dark:bg-zinc-800",
        textColor: "text-zinc-600 dark:text-zinc-400",
      };
  }
}

// Generate event description
function getEventDescription(
  event: ActivityEvent,
  currentUserId: string | undefined
): { action: string; details: string | null } {
  const isCurrentUser = event.user_id === currentUserId;
  const userName = isCurrentUser ? "You" : event.user_name || event.user_email;

  switch (event.event_type) {
    case "expense.created": {
      const expense = event.after_snapshot as { description?: string; amount_cents?: number } | null;
      const amount = expense?.amount_cents ? formatCurrency(expense.amount_cents) : "";
      return {
        action: `${userName} added an expense`,
        details: expense?.description ? `${expense.description}${amount ? ` - ${amount}` : ""}` : null,
      };
    }
    case "expense.edited": {
      const before = event.before_snapshot as { description?: string } | null;
      const after = event.after_snapshot as { description?: string } | null;
      return {
        action: `${userName} edited an expense`,
        details: after?.description || before?.description || null,
      };
    }
    case "expense.questioned": {
      const expense = event.after_snapshot as { description?: string } | null;
      return {
        action: `${userName} questioned an expense`,
        details: expense?.description || null,
      };
    }
    case "expense.resolved": {
      const expense = event.after_snapshot as { description?: string } | null;
      return {
        action: `${userName} resolved an expense`,
        details: expense?.description || null,
      };
    }
    case "payment.created": {
      const payment = event.after_snapshot as { amount_cents?: number } | null;
      const amount = payment?.amount_cents ? formatCurrency(payment.amount_cents) : "";
      return {
        action: `${userName} recorded a payment`,
        details: amount || null,
      };
    }
    case "child.created": {
      const child = event.after_snapshot as { name?: string } | null;
      return {
        action: `${userName} added a child`,
        details: child?.name || null,
      };
    }
    case "child.deleted": {
      const child = event.before_snapshot as { name?: string } | null;
      return {
        action: `${userName} removed a child`,
        details: child?.name || null,
      };
    }
    default:
      return {
        action: `${userName} performed an action`,
        details: null,
      };
  }
}

// Get link for event target
function getEventLink(event: ActivityEvent): string | null {
  switch (event.target_type) {
    case "expense":
      return `/expenses`; // Could link to specific expense if detail page exists
    case "payment":
      return `/payments`;
    case "child":
      return `/settings/children`;
    default:
      return null;
  }
}

export default function ActivityFeedPage() {
  const { user, isLoaded } = useUser();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await getActivity(user.id, meData.family.id, ITEMS_PER_PAGE, offset);

        if (append) {
          setEvents((prev) => [...prev, ...data.events]);
        } else {
          setEvents(data.events);
        }
        setTotalEvents(data.pagination.total);
        setCurrentOffset(offset + data.events.length);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        setError("Failed to load activity. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, meData?.family]
  );

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

  // Fetch activity when user data is loaded
  useEffect(() => {
    if (meData?.family) {
      fetchActivity(0, false);
    }
  }, [meData?.family, fetchActivity]);

  const handleLoadMore = () => {
    fetchActivity(currentOffset, true);
  };

  const hasMore = currentOffset < totalEvents;

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
                Activity Feed
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
              Activity Feed
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

        {/* Results Summary */}
        <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              Showing {events.length} of {totalEvents} event{totalEvents !== 1 ? "s" : ""}
            </>
          )}
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500">Loading activity...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No activity yet
            </p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Activity will appear here when you or your co-parent add expenses, payments, or children.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {events.map((event) => {
                const style = getEventStyle(event.event_type);
                const { action, details } = getEventDescription(event, user?.id);
                const link = getEventLink(event);

                const content = (
                  <div className="flex items-start gap-4 px-4 py-4 sm:px-6">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bgColor}`}
                    >
                      <span className={style.textColor}>{style.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {action}
                      </p>
                      {details && (
                        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                          {details}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                    {link && (
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                );

                return (
                  <li key={event.id}>
                    {link ? (
                      <Link
                        href={link}
                        className="block transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
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
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                About Activity Feed
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                This feed shows all actions taken by you and your co-parent, including expenses added, edited, questioned, resolved, payments made, and children added or removed.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
