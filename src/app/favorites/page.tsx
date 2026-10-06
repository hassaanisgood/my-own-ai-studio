import type { Metadata } from "next";
import { Gallery } from "@/components/results/Gallery";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return (
    <Gallery
      source="favorites"
      title="Favorites"
      description="Generations you've marked with a heart."
      empty={{
        title: "No favorites yet",
        body: "Use the heart on any result to keep it here for quick access.",
        action: { href: "/generations", label: "Browse generations" },
      }}
    />
  );
}
