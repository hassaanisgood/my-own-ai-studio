import Link from "next/link";
import { LogoLockup } from "./Logo";
import { NavLinks } from "./NavLinks";
import { MockNotice } from "./MockNotice";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-surface-1 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="rounded-lg" aria-label="Go to Create">
          <LogoLockup />
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 px-3 pt-3">
        <NavLinks />
      </nav>
      <div className="p-3">
        <MockNotice />
      </div>
    </aside>
  );
}
