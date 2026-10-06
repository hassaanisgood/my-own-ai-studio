"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { copyText, downloadAsset, downloadFilename } from "@/lib/download";
import type { GenerationItem } from "@/lib/types";
import { useFeedback } from "@/state/feedback";
import { useStudio } from "@/state/studio-store";

export function useResultActions() {
  const studio = useStudio();
  const { toast, announce } = useFeedback();
  const router = useRouter();
  const pathname = usePathname();

  const download = useCallback(
    async (item: GenerationItem) => {
      await downloadAsset(item);
      toast({ tone: "success", title: "Download started", description: downloadFilename(item) });
    },
    [toast],
  );

  const copyPrompt = useCallback(
    async (item: GenerationItem) => {
      const ok = await copyText(item.request.prompt);
      if (ok) toast({ tone: "success", title: "Prompt copied", description: "The full prompt is on your clipboard." });
      else toast({ tone: "error", title: "Couldn't copy the prompt", description: "Your browser blocked clipboard access." });
      return ok;
    },
    [toast],
  );

  const generateAgain = useCallback(
    (item: GenerationItem) => {
      const result = studio.generateAgain(item);
      if (!result.ok) {
        const message = result.reason ?? Object.values(result.errors)[0] ?? "These settings can't be generated.";
        toast({ tone: "error", title: "Couldn't start generation", description: message });
        announce(`Couldn't start generation. ${message}`, "assertive");
      }
      if (pathname !== "/") router.push("/");
      else document.getElementById("results-top")?.scrollIntoView({ block: "start" });
      return result;
    },
    [studio, toast, announce, pathname, router],
  );

  const editInCreate = useCallback(
    (item: GenerationItem) => {
      studio.restoreToComposer(item.request);
      announce("Prompt and settings restored in Create.");
      if (pathname !== "/") router.push("/");
      requestAnimationFrame(() => document.getElementById(`prompt-input-${item.request.mode}`)?.focus());
    },
    [studio, announce, pathname, router],
  );

  return {
    download,
    copyPrompt,
    generateAgain,
    editInCreate,
    toggleFavorite: studio.toggleFavorite,
    isFavorite: studio.isFavorite,
  };
}
