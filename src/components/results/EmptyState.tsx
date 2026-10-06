import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/** Quiet composition of empty frames in the studio's aspect ratios. */
function Frames() {
  return (
    <div className="relative mx-auto h-36 w-60" aria-hidden>
      <div className="absolute left-2 top-7 h-[92px] w-[164px] -rotate-6 rounded-lg border border-line-strong bg-gradient-to-br from-surface-3 to-surface-2" />
      <div className="absolute right-3 top-1 h-[124px] w-[70px] rotate-[5deg] rounded-lg border border-line-strong bg-gradient-to-b from-surface-3 to-surface-2" />
      <div className="absolute left-[74px] top-4 grid h-[112px] w-[90px] place-items-center rounded-lg border border-accent/40 bg-gradient-to-br from-[#2a1a12] to-surface-2 shadow-2xl shadow-black/60">
        <svg width="34" height="34" viewBox="0 0 32 32">
          <path
            d="M16 4.5c.6 5.2 1.7 6.5 6.6 7.2-4.9.7-6 2-6.6 7.2-.6-5.2-1.7-6.5-6.6-7.2 4.9-.7 6-2 6.6-7.2Z"
            fill="var(--color-accent)"
          />
          <rect x="7" y="23" width="18" height="1.6" rx=".8" fill="var(--color-accent)" opacity=".55" />
        </svg>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" data-testid="empty-state">
      <Frames />
      <h3 className="mt-7 text-[16px] font-semibold text-fg">{title}</h3>
      <div className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-fg-muted">{children}</div>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-accent hover:text-accent-strong"
        >
          {action.label} <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  );
}
