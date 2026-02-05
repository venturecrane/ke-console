type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "info"
  | "error"
  | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-ke-elevated text-ke-muted",
  success: "bg-ke-status-posted-bg text-ke-status-posted-text",
  warning: "bg-ke-status-questioned-bg text-ke-status-questioned-text",
  info: "bg-ke-status-resolved-bg text-ke-status-resolved-text",
  muted: "bg-ke-status-settled-bg text-ke-status-settled-text",
  error: "bg-ke-status-closed-bg text-ke-status-closed-text",
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

export { Badge, type BadgeProps, type BadgeVariant };
