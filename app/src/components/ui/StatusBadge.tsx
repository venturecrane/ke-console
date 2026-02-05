import type { ExpenseStatus } from "@/lib/api";
import { Badge, type BadgeVariant } from "./Badge";

// Maps the 8 ExpenseStatus values to generic badge variants
const statusVariantMap: Record<ExpenseStatus, BadgeVariant> = {
  posted: "success",
  questioned: "warning",
  pending_satisfaction: "info",
  resolved: "info",
  resolved_creator_decided: "info",
  resolved_personal: "muted",
  resolved_deleted: "muted",
  closed_unresolved: "error",
};

// Maps the 8 ExpenseStatus values to display labels
const statusLabelMap: Record<ExpenseStatus, string> = {
  posted: "Posted",
  questioned: "Questioned",
  pending_satisfaction: "Pending",
  resolved: "Resolved",
  resolved_creator_decided: "Resolved (timeout)",
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
  StatusBadge,
  statusVariantMap,
  statusLabelMap,
  type StatusBadgeProps,
};
