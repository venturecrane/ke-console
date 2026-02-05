type AlertVariant = "info" | "attention" | "error" | "success";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "border-ke-accent bg-ke-accent-soft text-ke-accent-soft-text",
  attention:
    "border-l-4 border-ke-attention-border bg-ke-attention-bg text-ke-primary",
  error: "border-ke-negative bg-ke-status-closed-bg text-ke-status-closed-text",
  success:
    "border-ke-positive bg-ke-status-posted-bg text-ke-status-posted-text",
};

function Alert({ variant = "info", className = "", children }: AlertProps) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

export { Alert, type AlertProps, type AlertVariant };
