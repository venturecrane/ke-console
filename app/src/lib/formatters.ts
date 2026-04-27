// Shared formatters for currency, category, and status-label display.
// Status badge styling lives in components/ui/Badge.tsx (variant -> ke-* tokens);
// do not reintroduce hardcoded Tailwind palette classes here.

export function formatCurrency(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

export function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
