"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: "default" | "accent" | "danger";
  active?: boolean;
}

/** Square icon button with an accessible name and a hover tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, children, tone = "default", active, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={
        "grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? tone === "danger"
            ? "text-danger hover:bg-danger-soft "
            : "text-accent hover:bg-accent-soft "
          : tone === "danger"
            ? "text-fg-muted hover:bg-danger-soft hover:text-danger "
            : "text-fg-muted hover:bg-white/[0.06] hover:text-fg ") +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
});
