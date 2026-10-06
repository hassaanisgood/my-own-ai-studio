"use client";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export function Switch({ checked, onChange, label, description, id }: Props) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[14px] font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-1 text-[13px] leading-snug text-fg-subtle">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors " +
          (checked ? "border-accent bg-accent" : "border-line-strong bg-surface-4")
        }
      >
        <span
          className={
            "inline-block size-[18px] rounded-full shadow transition-transform " +
            (checked ? "translate-x-[19px] bg-accent-ink" : "translate-x-[2px] bg-fg-muted")
          }
        />
      </button>
    </div>
  );
}
