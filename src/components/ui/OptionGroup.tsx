"use client";

import type { ReactNode } from "react";

export interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** Accessible label when `label` is not plain text. */
  ariaLabel?: string;
}

interface Props<T extends string | number> {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  /** Extra text rendered to the right of the legend. */
  aside?: ReactNode;
  columns?: number;
  size?: "sm" | "md";
  id?: string;
}

/**
 * Segmented control built from native radio inputs, so arrow keys, focus and
 * screen-reader semantics come for free.
 */
export function OptionGroup<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  aside,
  columns,
  size = "md",
  id,
}: Props<T>) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset id={id} aria-describedby={errorId} aria-invalid={error ? true : undefined} className="relative min-w-0">
      <legend className="mb-2 text-[12.5px] font-medium text-fg-muted">{legend}</legend>
      {aside && <span className="absolute right-0 top-0 text-[12px] text-fg-subtle">{aside}</span>}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const checked = opt.value === value;
          const inputId = `${name}-${String(opt.value).replace(/[^a-z0-9]/gi, "_")}`;
          return (
            <label
              key={String(opt.value)}
              htmlFor={inputId}
              className={
                "relative flex min-w-0 cursor-pointer select-none flex-col items-center justify-center rounded-lg border text-center transition-colors " +
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent " +
                (size === "sm" ? "min-h-9 px-2 py-1.5 " : "min-h-11 px-2 py-2 ") +
                (opt.disabled
                  ? "cursor-not-allowed border-line text-fg-subtle/60 opacity-50 "
                  : checked
                    ? "border-accent/60 bg-accent-soft text-fg "
                    : "border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg ")
              }
            >
              <input
                type="radio"
                id={inputId}
                name={name}
                value={String(opt.value)}
                checked={checked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                aria-label={opt.ariaLabel}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-lg opacity-0 disabled:cursor-not-allowed"
              />
              <span className="flex items-center gap-1.5 text-[13px] font-medium">
                {opt.icon}
                {opt.label}
              </span>
              {opt.hint && <span className="mt-0.5 text-[11px] text-fg-subtle">{opt.hint}</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
