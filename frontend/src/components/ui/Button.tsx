import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "destructive" | "light";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      fullWidth = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 ease-in-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[var(--color-primary)] text-white hover:bg-[#0284c7] active:bg-[#0369a1] border border-transparent",
      secondary:
        "bg-transparent text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-muted)]",
      accent:
        "bg-[var(--color-accent)] text-white hover:bg-[#15803d] active:bg-[#166534] border border-transparent",
      outline:
        "bg-white text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)]",
      ghost:
        "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] border border-transparent",
      destructive:
        "bg-[var(--color-destructive)] text-white hover:bg-[#b91c1c] active:bg-[#991b1b] border border-transparent",
      light:
        "bg-white text-[var(--color-primary)] border border-white hover:bg-[var(--color-background)]",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
    };

    const widthStyle = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
