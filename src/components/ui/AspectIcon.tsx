import type { AspectRatio } from "@/lib/types";

/** Tiny outline that previews an aspect ratio. */
export function AspectIcon({ ratio, className = "" }: { ratio: AspectRatio; className?: string }) {
  const [w, h] = ratio.split(":").map(Number);
  const max = 13;
  const scale = max / Math.max(w, h);
  const rw = Math.max(5, w * scale);
  const rh = Math.max(5, h * scale);
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} aria-hidden focusable="false">
      <rect x={(16 - rw) / 2} y={(16 - rh) / 2} width={rw} height={rh} rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
