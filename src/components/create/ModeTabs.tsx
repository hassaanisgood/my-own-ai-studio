"use client";

import { useRef, type KeyboardEvent } from "react";
import { Clapperboard, ImageIcon } from "lucide-react";
import type { Mode } from "@/lib/types";

const TABS: { mode: Mode; label: string; icon: typeof ImageIcon }[] = [
  { mode: "image", label: "Image", icon: ImageIcon },
  { mode: "video", label: "Video", icon: Clapperboard },
];

export function ModeTabs({ mode, onChange, panelId }: { mode: Mode; onChange: (m: Mode) => void; panelId: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(TABS[next].mode);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Generation mode" className="inline-flex rounded-xl border border-line bg-surface-1 p-1">
      {TABS.map((tab, i) => {
        const selected = tab.mode === mode;
        const Icon = tab.icon;
        return (
          <button
            key={tab.mode}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.mode}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.mode)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={
              "flex h-9 items-center gap-2 rounded-lg px-4 text-[13.5px] font-medium transition-colors " +
              (selected ? "bg-surface-4 text-fg shadow-sm shadow-black/40" : "text-fg-muted hover:text-fg")
            }
          >
            <Icon size={15} aria-hidden className={selected ? "text-accent" : ""} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
