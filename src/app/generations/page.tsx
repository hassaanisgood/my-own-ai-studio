import type { Metadata } from "next";
import { Gallery } from "@/components/results/Gallery";

export const metadata: Metadata = { title: "Generations" };

export default function GenerationsPage() {
  return (
    <Gallery
      source="history"
      title="Generations"
      description="Every image and video you've generated, newest first. Stored in this browser."
      empty={{
        title: "No generations yet",
        body: "Head to Create to make your first image or video. Sample generations can be restored from Settings.",
        action: { href: "/", label: "Start creating" },
      }}
    />
  );
}
