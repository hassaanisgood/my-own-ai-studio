"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useStudio } from "@/state/studio-store";
import { LogoLockup } from "./Logo";
import { NavLinks } from "./NavLinks";
import { MockNotice } from "./MockNotice";
import { NAV_ITEMS, isActive } from "./nav";

export function MobileHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const { state } = useStudio();
  const activeJobs = state.jobs.filter((j) => j.status === "queued" || j.status === "running").length;
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  const close = () => dialogRef.current?.close();
  useEffect(() => close(), [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-lg lg:hidden">
      <Link href="/" className="rounded-lg" aria-label="Go to Create">
        <LogoLockup compact />
      </Link>
      <div className="flex items-center gap-2">
        {activeJobs > 0 && (
          <Link href="/#results-top" className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {activeJobs} running
          </Link>
        )}
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
          aria-label={`Open navigation${current ? ` (current page: ${current.label})` : ""}`}
          aria-haspopup="dialog"
        >
          <Menu size={20} aria-hidden />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        className="m-0 ml-auto h-dvh max-h-none w-[min(84vw,320px)] max-w-none border-l border-line bg-surface-1 p-0 text-fg open:animate-fade-in"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <LogoLockup compact />
            <button
              type="button"
              onClick={close}
              className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
              aria-label="Close navigation"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <nav aria-label="Primary" className="flex-1 px-4 pt-4">
            <NavLinks onNavigate={close} size="lg" />
          </nav>
          <div className="p-4">
            <MockNotice />
          </div>
        </div>
      </dialog>
    </header>
  );
}
