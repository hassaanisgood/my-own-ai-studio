import { Heart, LayoutGrid, Settings2, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Key used to show a count badge. */
  count?: "generations" | "favorites";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Create", icon: Sparkles },
  { href: "/generations", label: "Generations", icon: LayoutGrid, count: "generations" },
  { href: "/favorites", label: "Favorites", icon: Heart, count: "favorites" },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
