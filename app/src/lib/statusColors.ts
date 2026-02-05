// Shared utility functions for status badges, currency formatting, and category display

// Format cents to dollars display
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

// Format category for display
export function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Get status badge color classes
export function getStatusColor(status: string): string {
  switch (status) {
    case "posted":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "questioned":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    case "pending_satisfaction":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400";
    case "resolved":
    case "resolved_creator_decided":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400";
    case "resolved_personal":
    case "resolved_deleted":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    case "closed_unresolved":
      return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

// Format status for display
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
