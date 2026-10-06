"use client";

import { useId } from "react";
import { studio } from "@/config/studio";

/** Original studio mark: a north-star glint over a horizon line, on a warm tile. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  // Unique per instance: a gradient defined inside a display:none SVG fails to paint elsewhere.
  const id = `logo-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={studio.logo.from} />
          <stop offset="1" stopColor={studio.logo.to} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="white" strokeOpacity="0.18" />
      {studio.logo.variant === "monogram" ? (
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#1d0c03"
          fontFamily="var(--font-geist-sans), system-ui"
        >
          {studio.logo.monogram}
        </text>
      ) : (
        <g fill="#1d0c03">
          <path d="M16 5.5c.55 4.7 1.55 5.9 6 6.5-4.45.6-5.45 1.8-6 6.5-.55-4.7-1.55-5.9-6-6.5 4.45-.6 5.45-1.8 6-6.5Z" />
          <rect x="7" y="22.25" width="18" height="1.75" rx=".875" opacity=".85" />
          <rect x="11" y="25.5" width="10" height="1.5" rx=".75" opacity=".5" />
        </g>
      )}
    </svg>
  );
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 26 : 30} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{studio.name}</span>
        {!compact && <span className="mt-1 text-[11px] font-medium text-fg-subtle">{studio.descriptor}</span>}
      </span>
    </span>
  );
}
