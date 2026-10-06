"use client";

import { playableSource } from "@/lib/media";
import type { GenerationItem } from "@/lib/types";

/** Renders the stored asset itself — the same file the Download action saves. */
export function Media({
  item,
  loop,
  className = "",
  fit = "cover",
  eager = false,
}: {
  item: GenerationItem;
  loop: boolean;
  className?: string;
  fit?: "cover" | "contain";
  eager?: boolean;
}) {
  const { asset, request } = item;
  if (asset.kind === "video") {
    const source = playableSource(asset);
    return (
      <video
        key={source.url}
        src={source.url}
        poster={asset.posterUrl}
        controls
        playsInline
        loop={loop}
        preload="metadata"
        aria-label={`Generated video: ${request.prompt}`}
        className={`block size-full bg-black ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
      />
    );
  }
  return (
    <img
      src={asset.url}
      alt={`Generated image: ${request.prompt}`}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`block size-full ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
    />
  );
}
