"use client";

import { useState } from "react";
import { Check, Copy, Download, Heart, Maximize2, RotateCcw } from "lucide-react";
import { getModel } from "@/config/models";
import { resolutionLabel } from "@/lib/drafts";
import { formatFullTimestamp, formatTimestamp } from "@/lib/format";
import { formatCost } from "@/lib/pricing";
import type { GenerationItem } from "@/lib/types";
import { useStudio } from "@/state/studio-store";
import { IconButton } from "@/components/ui/IconButton";
import { Media } from "./Media";
import { useResultActions } from "./useResultActions";

interface Props {
  item: GenerationItem;
  onOpen: (item: GenerationItem) => void;
  fresh?: boolean;
  now: number;
}

export function ResultCard({ item, onOpen, fresh, now }: Props) {
  const { state } = useStudio();
  const actions = useResultActions();
  const [copied, setCopied] = useState(false);
  const favorite = actions.isFavorite(item.id);
  const model = getModel(item.request.modelId);
  const { request, asset } = item;
  const spec =
    request.mode === "video" ? `${request.duration}s · ${resolutionLabel(request)}` : `${resolutionLabel(request)} · ${request.aspectRatio}`;

  return (
    <article
      aria-label={`${request.mode === "video" ? "Video" : "Image"} by ${model?.name ?? request.modelId}`}
      className="group mb-4 break-inside-avoid overflow-hidden rounded-xl border border-line bg-surface-1 transition-colors hover:border-line-strong motion-safe:animate-rise"
      data-testid="result-card"
      data-kind={asset.kind}
    >
      <div className="checker relative" style={{ aspectRatio: `${asset.width} / ${asset.height}` }}>
        {asset.kind === "image" ? (
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="block size-full cursor-zoom-in focus-visible:outline-offset-[-2px]"
            aria-label={`Open details for image: ${request.prompt.slice(0, 80)}`}
          >
            <Media item={item} loop={false} />
          </button>
        ) : (
          <Media item={item} loop={state.settings.loopVideoPreviews} />
        )}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex gap-1.5">
          {fresh && (
            <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent-ink">
              New
            </span>
          )}
          {item.sample && (
            <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10.5px] font-medium text-white/85 backdrop-blur">
              Sample
            </span>
          )}
        </div>
      </div>

      <div className="px-3.5 pb-2.5 pt-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-fg" title={request.prompt}>
          {request.prompt}
        </p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[12px] text-fg-subtle">
          <dt className="sr-only">Model</dt>
          <dd className="truncate font-medium text-fg-muted">{model?.name ?? request.modelId}</dd>
          {state.settings.showCostEstimates ? (
            <>
              <dt className="sr-only">Mock cost</dt>
              <dd className="text-right font-mono text-fg-muted" title="Illustrative mock cost">
                {formatCost(item.cost)}
              </dd>
            </>
          ) : (
            <dd aria-hidden />
          )}
          <dt className="sr-only">Settings and time</dt>
          <dd className="col-span-2 truncate">
            {spec} <span aria-hidden className="px-0.5 text-line-strong">·</span>{" "}
            <time dateTime={item.createdAt} title={formatFullTimestamp(item.createdAt)}>
              {formatTimestamp(item.createdAt, now)}
            </time>
          </dd>
        </dl>
        <div className="-mx-1.5 mt-2 flex items-center gap-0.5" role="group" aria-label="Actions">
          <IconButton label="Download" onClick={() => void actions.download(item)}>
            <Download size={15} aria-hidden />
          </IconButton>
          <IconButton
            label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
            active={favorite}
            onClick={() => actions.toggleFavorite(item.id)}
          >
            <Heart size={15} aria-hidden fill={favorite ? "currentColor" : "none"} />
          </IconButton>
          <IconButton
            label={copied ? "Prompt copied" : "Copy prompt"}
            active={copied}
            onClick={async () => {
              if (await actions.copyPrompt(item)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }
            }}
          >
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          </IconButton>
          <IconButton label="Generate again" onClick={() => actions.generateAgain(item)}>
            <RotateCcw size={15} aria-hidden />
          </IconButton>
          <span className="flex-1" />
          <IconButton label="View details" onClick={() => onOpen(item)}>
            <Maximize2 size={14} aria-hidden />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
