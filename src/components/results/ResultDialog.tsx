"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Heart, PencilLine, RotateCcw, Trash2, X } from "lucide-react";
import { ASPECT_RATIO_LABELS, getModel } from "@/config/models";
import { resolutionLabel } from "@/lib/drafts";
import { formatBytes, formatFullTimestamp } from "@/lib/format";
import { formatCost } from "@/lib/pricing";
import { extensionFor, playableSource } from "@/lib/media";
import type { GenerationItem } from "@/lib/types";
import { useStudio } from "@/state/studio-store";
import { useFeedback } from "@/state/feedback";
import { btn } from "@/components/ui/buttons";
import { useReferenceUrl } from "@/components/create/ReferenceUpload";
import { Media } from "./Media";
import { useResultActions } from "./useResultActions";

interface Props {
  item: GenerationItem | null;
  items: GenerationItem[];
  onClose: () => void;
  onNavigate: (item: GenerationItem) => void;
}

export function ResultDialog({ item, items, onClose, onNavigate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!item && dialog.open) {
      dialog.close();
    }
  }, [item]);

  const index = item ? items.findIndex((i) => i.id === item.id) : -1;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="result-dialog-title"
      onClose={() => {
        onClose();
        // Return focus to whatever opened the dialog.
        const el = opener.current;
        if (el instanceof HTMLElement && document.contains(el)) el.focus();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === "VIDEO") return;
        if (e.key === "ArrowLeft" && prev) onNavigate(prev);
        if (e.key === "ArrowRight" && next) onNavigate(next);
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto h-[100dvh] max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-black/80 sm:h-auto sm:max-h-[92dvh] sm:w-[min(1180px,94vw)]"
    >
      {item && (
        <DialogBody
          item={item}
          onClose={() => ref.current?.close()}
          prev={prev}
          next={next}
          onNavigate={onNavigate}
          position={`${index + 1} of ${items.length}`}
        />
      )}
    </dialog>
  );
}

function DialogBody({
  item,
  onClose,
  prev,
  next,
  onNavigate,
  position,
}: {
  item: GenerationItem;
  onClose: () => void;
  prev: GenerationItem | null;
  next: GenerationItem | null;
  onNavigate: (item: GenerationItem) => void;
  position: string;
}) {
  const studio = useStudio();
  const actions = useResultActions();
  const { announce } = useFeedback();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { request, asset } = item;
  const model = getModel(request.modelId);
  const favorite = actions.isFavorite(item.id);
  const reference = useReferenceUrl(request.mode === "video" ? request.reference?.id : undefined);

  const rows: [string, string][] = [
    ["Model", model?.name ?? request.modelId],
    ["Type", request.mode === "image" ? "Image" : "Video"],
    ["Aspect ratio", `${request.aspectRatio} · ${ASPECT_RATIO_LABELS[request.aspectRatio]}`],
    ["Resolution", resolutionLabel(request)],
    request.mode === "video"
      ? ["Duration", `${request.duration} seconds`]
      : ["Batch", `${item.index + 1} of ${request.outputs}`],
    ["Seed", String(asset.seed)],
    ["Mock cost", formatCost(item.cost)],
    ["Created", formatFullTimestamp(item.createdAt)],
    ["File", `${asset.width}×${asset.height} ${extensionFor(playableSource(asset).mimeType).toUpperCase()} (placeholder)`],
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden border-line bg-surface-1 sm:rounded-2xl sm:border lg:flex-row">
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/60 p-3 sm:p-5 lg:min-h-[60vh]">
        <div className="relative flex max-h-[58dvh] w-full items-center justify-center lg:max-h-[84dvh]" style={{ aspectRatio: `${asset.width} / ${asset.height}`, maxWidth: `calc(${asset.width / asset.height} * 84dvh)` }}>
          <Media item={item} loop={studio.state.settings.loopVideoPreviews} fit="contain" eager className="max-h-[58dvh] lg:max-h-[84dvh]" />
        </div>
        {prev && (
          <button
            type="button"
            onClick={() => onNavigate(prev)}
            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/85 backdrop-blur hover:bg-black/80"
            aria-label="Previous generation"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => onNavigate(next)}
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/85 backdrop-blur hover:bg-black/80"
            aria-label="Next generation"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        )}
      </div>

      <aside className="flex max-h-[42dvh] w-full shrink-0 flex-col overflow-y-auto border-t border-line sm:max-h-none lg:w-[360px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="result-dialog-title" className="truncate text-[15px] font-semibold">
              {request.mode === "image" ? "Image" : "Video"} · {model?.name}
            </h2>
            <p className="text-[12px] text-fg-subtle">{position}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
            aria-label="Close details"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-4">
          <section aria-labelledby="dlg-prompt">
            <div className="flex items-center justify-between">
              <h3 id="dlg-prompt" className="text-[12px] font-medium text-fg-subtle">
                Prompt
              </h3>
              <button
                type="button"
                onClick={() => void actions.copyPrompt(item)}
                className="-mr-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
              >
                <Copy size={13} aria-hidden /> Copy prompt
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-fg">{request.prompt}</p>
          </section>

          {request.mode === "video" && request.reference && (
            <section aria-labelledby="dlg-ref">
              <h3 id="dlg-ref" className="text-[12px] font-medium text-fg-subtle">
                Reference image
              </h3>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="checker size-12 overflow-hidden rounded-md">
                  {reference.url && <img src={reference.url} alt="" className="size-full object-cover" />}
                </div>
                <p className="min-w-0 truncate text-[13px] text-fg-muted">
                  {request.reference.name} · {formatBytes(request.reference.size)}
                  {!reference.url && !reference.loading && " · file no longer stored"}
                </p>
              </div>
            </section>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-subtle">{k}</dt>
                <dd className="text-right text-fg-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11.5px] leading-snug text-fg-subtle">
            Costs are illustrative mock estimates. This asset is a locally stored placeholder; no AI service was called.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
          <button type="button" className={btn.primary + " h-10 text-[13.5px]"} onClick={() => actions.generateAgain(item)}>
            <RotateCcw size={15} aria-hidden /> Generate again
          </button>
          <button type="button" className={btn.secondary + " h-10 text-[13.5px]"} onClick={() => void actions.download(item)}>
            <Download size={15} aria-hidden /> Download
          </button>
          <button
            type="button"
            aria-pressed={favorite}
            className={btn.secondary + " h-10 text-[13.5px] " + (favorite ? "text-accent" : "")}
            onClick={() => actions.toggleFavorite(item.id)}
          >
            <Heart size={15} aria-hidden fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorited" : "Favorite"}
          </button>
          <button
            type="button"
            className={btn.secondary + " h-10 text-[13.5px]"}
            onClick={() => {
              onClose();
              actions.editInCreate(item);
            }}
          >
            <PencilLine size={15} aria-hidden /> Edit in Create
          </button>
          {confirmDelete ? (
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-danger-soft p-2" role="group" aria-label="Confirm delete">
              <p className="flex-1 px-1 text-[12.5px] text-fg">Delete from history?</p>
              <button type="button" className={btn.ghost + " h-8 text-[12.5px]"} onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
              <button
                type="button"
                autoFocus
                className={btn.danger + " h-8 text-[12.5px]"}
                onClick={() => {
                  const target = next ?? prev;
                  studio.deleteItem(item.id);
                  announce("Generation deleted.");
                  setConfirmDelete(false);
                  if (target) onNavigate(target);
                  else onClose();
                }}
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={btn.ghost + " col-span-2 h-9 text-[12.5px] hover:text-danger"}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} aria-hidden /> Delete from history
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
