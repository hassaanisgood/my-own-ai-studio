import { studio } from "@/config/studio";
import { getModel } from "@/config/models";
import type { GenerationItem } from "./types";
import { slugify } from "./format";
import { extensionFor, playableSource } from "./media";

export function downloadFilename(item: GenerationItem): string {
  const d = new Date(item.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const model = slugify(getModel(item.request.modelId)?.name ?? item.request.modelId);
  const ext = extensionFor(playableSource(item.asset).mimeType);
  const suffix = item.index > 0 ? `-${item.index + 1}` : "";
  return `${studio.filePrefix}-${model}-${stamp}${suffix}.${ext}`;
}

/** Saves the exact file shown in the gallery. Falls back to a plain link if fetch fails. */
export async function downloadAsset(item: GenerationItem): Promise<void> {
  const filename = downloadFilename(item);
  const a = document.createElement("a");
  a.download = filename;
  a.rel = "noopener";
  let objectUrl: string | null = null;
  try {
    const res = await fetch(playableSource(item.asset).url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    objectUrl = URL.createObjectURL(await res.blob());
    a.href = objectUrl;
  } catch {
    a.href = playableSource(item.asset).url;
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 10_000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
