"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudio } from "@/state/studio-store";
import { NAV_ITEMS, isActive } from "./nav";

export function NavLinks({ onNavigate, size = "md" }: { onNavigate?: () => void; size?: "md" | "lg" }) {
  const pathname = usePathname();
  const { state } = useStudio();
  const activeJobs = state.jobs.filter((j) => j.status === "queued" || j.status === "running").length;
  const counts = { generations: state.history.length, favorites: state.favorites.length };

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const count = item.count && state.hydrated ? counts[item.count] : null;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={
                "group relative flex items-center gap-3 rounded-lg px-3 font-medium transition-colors " +
                (size === "lg" ? "h-12 text-[15px]" : "h-9 text-[13.5px]") +
                " " +
                (active ? "bg-white/[0.07] text-fg" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg")
              }
            >
              {active && <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r bg-accent" aria-hidden />}
              <Icon size={size === "lg" ? 18 : 16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-accent" : ""} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.href === "/" && activeJobs > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] text-accent">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
                  </span>
                  <span className="sr-only">,</span>
                  {activeJobs} running
                </span>
              )}
              {count !== null && count !== undefined && count > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  <span className="sr-only">, </span>
                  {count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
