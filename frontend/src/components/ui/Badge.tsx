import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "info" | "neutral" | "primary";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "neutral",
  children,
  ...props
}) => {
  const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    info: "bg-sky-50 text-sky-800 border-sky-200",
    primary: "bg-[var(--color-background)] text-[var(--color-primary)] border-[var(--color-border)]",
    neutral: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-full border transition-colors duration-150 ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
