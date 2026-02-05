import type { ExpenseStatus } from "@/lib/api";

/**
 * Statuses that require action from one of the parents.
 * closed_unresolved excluded until the close flow ships.
 */
export const NEEDS_ATTENTION_STATUSES: ExpenseStatus[] = [
  "questioned",
  "pending_satisfaction",
];

export function isNeedsAttention(status: ExpenseStatus): boolean {
  return NEEDS_ATTENTION_STATUSES.includes(status);
}
