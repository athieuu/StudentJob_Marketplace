import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-5 transition-colors duration-150 ease-in-out ${
          interactive
            ? "hover:border-[var(--color-primary)] cursor-pointer"
            : ""
        } ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
