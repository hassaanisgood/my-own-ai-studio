import type { GeneratedAsset } from "./types";

export interface MediaSource {
  url: string;
  mimeType: string;
  /** RFC 6381 codec string used to probe support, e.g. "avc1.64001F". */
  codecs?: string;
}

const support = new Map<string, boolean>();

function canPlay(source: MediaSource): boolean {
  const type = source.codecs ? `${source.mimeType}; codecs="${source.codecs}"` : source.mimeType;
  let ok = support.get(type);
  if (ok === undefined) {
    ok = document.createElement("video").canPlayType(type) !== "";
    support.set(type, ok);
  }
  return ok;
}

/**
 * The source this browser will actually play. The player and the Download
 * action both use it, so a download is always the exact file being shown.
 */
export function playableSource(asset: GeneratedAsset): MediaSource {
  const primary: MediaSource = { url: asset.url, mimeType: asset.mimeType, codecs: asset.codecs };
  if (asset.kind !== "video" || typeof document === "undefined") return primary;
  return [primary, ...(asset.alternates ?? [])].find(canPlay) ?? primary;
}

export function extensionFor(mimeType: string): string {
  return ({ "video/mp4": "mp4", "video/webm": "webm", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[mimeType] ?? "jpg";
}
