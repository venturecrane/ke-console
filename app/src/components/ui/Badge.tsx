import type { ExpenseStatus } from "@/lib/api";

type BadgeVariant =
  | "default"
  | "posted"
  | "questioned"
  | "resolved"
  | "settled"
  | "closed";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-ke-elevated text-ke-muted",
  posted: "bg-ke-status-posted-bg text-ke-status-posted-text",
  questioned: "bg-ke-status-questioned-bg text-ke-status-questioned-text",
  resolved: "bg-ke-status-resolved-bg text-ke-status-resolved-text",
  settled: "bg-ke-status-settled-bg text-ke-status-settled-text",
  closed: "bg-ke-status-closed-bg text-ke-status-closed-text",
};

function Badge({ variant = "default", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Maps the 8 ExpenseStatus values to badge variants
const statusVariantMap: Record<ExpenseStatus, BadgeVariant> = {
  posted: "posted",
  questioned: "questioned",
  pending_satisfaction: "resolved",
  resolved: "resolved",
  resolved_creator_decided: "resolved",
  resolved_personal: "settled",
  resolved_deleted: "settled",
  closed_unresolved: "closed",
};

// Maps the 8 ExpenseStatus values to display labels
const statusLabelMap: Record<ExpenseStatus, string> = {
  posted: "Posted",
  questioned: "Questioned",
  pending_satisfaction: "Pending",
  resolved: "Resolved",
  resolved_creator_decided: "Auto-Resolved",
  resolved_personal: "Personal",
  resolved_deleted: "Deleted",
  closed_unresolved: "Unresolved",
};

interface StatusBadgeProps {
  status: ExpenseStatus;
  className?: string;
}

function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]} className={className}>
      {statusLabelMap[status]}
    </Badge>
  );
}

export {
  Badge,
  StatusBadge,
  statusVariantMap,
  statusLabelMap,
  type BadgeProps,
  type BadgeVariant,
  type StatusBadgeProps,
};
