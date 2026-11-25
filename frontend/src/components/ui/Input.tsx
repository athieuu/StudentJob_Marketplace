import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, icon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full bg-white text-[var(--color-foreground)] border rounded-lg text-sm transition-colors duration-150 ease-in-out placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] disabled:bg-[var(--color-muted)] disabled:cursor-not-allowed ${
              icon ? "pl-9 pr-3.5 py-2" : "px-3.5 py-2"
            } ${
              error
                ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
                : "border-[var(--color-border)]"
            } ${className}`.trim()}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-[var(--color-destructive)] font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, disabled, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full bg-white text-[var(--color-foreground)] border rounded-lg px-3.5 py-2 text-sm transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] disabled:bg-[var(--color-muted)] disabled:cursor-not-allowed cursor-pointer ${
            error
              ? "border-[var(--color-destructive)]"
              : "border-[var(--color-border)]"
          } ${className}`.trim()}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-xs text-[var(--color-destructive)] font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
