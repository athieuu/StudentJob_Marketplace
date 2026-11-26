import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

function extractOptionsFromChildren(children: React.ReactNode): SelectOption[] {
  const list: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      list.push(...extractOptionsFromChildren((child.props as { children?: React.ReactNode }).children));
      return;
    }
    if (child.type === "option") {
      const props = child.props as { value?: string | number; children?: React.ReactNode };
      const label =
        typeof props.children === "string" || typeof props.children === "number"
          ? String(props.children)
          : Array.isArray(props.children)
            ? props.children.map((x) => (typeof x === "string" || typeof x === "number" ? String(x) : "")).join("")
            : "";
      const value = props.value !== undefined ? String(props.value) : label;
      list.push({ value, label });
    }
  });
  return list;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  children,
  icon,
  error,
  disabled = false,
  placeholder = "Chọn mục...",
  className = "",
  "aria-label": ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parsedOptions = useMemo(
    () => (options && options.length ? options : extractOptionsFromChildren(children)),
    [options, children]
  );

  const selectedOption = parsedOptions.find((o) => o.value === String(value ?? ""));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (nextValue: string) => {
    setOpen(false);
    if (onChange) {
      onChange({ target: { value: nextValue } });
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white text-left text-xs font-medium rounded-lg border px-3.5 py-2 transition-colors duration-150 cursor-pointer select-none disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed ${
          error
            ? "border-[var(--color-destructive)]"
            : open
              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-ring)]"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-[var(--color-muted-foreground)] shrink-0 flex items-center">
              {icon}
            </span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? "text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`text-[var(--color-muted-foreground)] shrink-0 transition-transform duration-150 ${
            open ? "rotate-180 text-[var(--color-primary)]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white border border-[var(--color-border)] rounded-xl shadow-lg p-1.5 z-50 max-h-60 overflow-y-auto"
        >
          {parsedOptions.map((opt) => {
            const isSelected = opt.value === String(value ?? "");
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-background)]"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-[var(--color-primary)]" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-[var(--color-destructive)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

Select.displayName = "Select";
