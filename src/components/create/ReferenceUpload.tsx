"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Lock, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { createId } from "@/lib/id";
import { loadReferenceUrl, saveReference } from "@/lib/storage/idb";
import type { ReferenceImage } from "@/lib/types";
import { validateReferenceFile } from "@/lib/validation";
import { useFeedback } from "@/state/feedback";

export function useReferenceUrl(id: string | undefined) {
  const [url, setUrl] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadReferenceUrl(id).then((u) => alive && setUrl({ id, url: u }));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!id || url?.id !== id) return { url: null, loading: !!id };
  return { url: url.url, loading: false };
}

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

interface Props {
  value: ReferenceImage | null;
  onChange: (value: ReferenceImage | null) => void;
  supported: boolean;
  modelName: string;
  error?: string;
  id: string;
}

export function ReferenceUpload({ value, onChange, supported, modelName, error, id }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, announce } = useFeedback();
  const preview = useReferenceUrl(value?.id);
  const shownError = [fileError, error].filter(Boolean).join(" ") || undefined;
  const errorId = `${id}-error`;

  const accept = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateReferenceFile(file);
    if (problem) {
      setFileError(problem);
      announce(`Reference not added. ${problem}`, "assertive");
      return;
    }
    setFileError(null);
    setBusy(true);
    const dims = await readDimensions(file);
    if (!dims) {
      setBusy(false);
      setFileError("That image couldn't be read. Try a different file.");
      return;
    }
    const refId = createId("ref");
    const { persisted } = await saveReference(refId, file);
    setBusy(false);
    onChange({ id: refId, name: file.name, type: file.type, size: file.size, ...dims });
    announce(`Reference image ${file.name} added.`);
    if (!persisted)
      toast({
        tone: "info",
        title: "Reference kept for this session only",
        description: "Browser storage is unavailable, so it won't survive a refresh.",
      });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!supported) return;
    void accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span id={`${id}-label`} className="text-[12.5px] font-medium text-fg-muted">
          Reference image <span className="font-normal text-fg-subtle">· optional</span>
        </span>
        <span className="text-[11.5px] text-fg-subtle">PNG, JPEG or WebP · up to 10 MB</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div
          className={
            "flex items-center gap-3 rounded-xl border bg-surface-2 p-2.5 " + (error ? "border-danger/60" : "border-line")
          }
        >
          <div className="checker relative size-16 shrink-0 overflow-hidden rounded-lg">
            {preview.url ? (
              <img src={preview.url} alt={`Reference: ${value.name}`} className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center px-1 text-center text-[10px] text-fg-subtle">
                {preview.loading ? "Loading…" : "Preview unavailable"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-fg">{value.name}</p>
            <p className="mt-0.5 text-[12px] text-fg-subtle">
              {value.width && value.height ? `${value.width}×${value.height} · ` : ""}
              {formatBytes(value.size)} · used as the first frame
            </p>
          </div>
          <button
            id={id}
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
            aria-describedby={shownError ? errorId : undefined}
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setFileError(null);
              announce("Reference image removed.");
            }}
            className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"
            aria-label={`Remove reference image ${value.name}`}
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (supported) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={
            "flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 transition-colors " +
            (!supported
              ? "border-line bg-transparent"
              : dragging
                ? "border-accent bg-accent-soft"
                : "border-line-strong bg-surface-2/60 hover:border-fg-subtle/60")
          }
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-fg-muted" aria-hidden>
            {supported ? <ImagePlus size={17} /> : <Lock size={15} />}
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg-muted">
            {supported ? (
              <>
                Animate from a still. <span className="hidden sm:inline">Drop an image here or </span>
              </>
            ) : (
              <>{modelName} is text-to-video only in this configuration.</>
            )}
          </p>
          <button
            id={id}
            type="button"
            disabled={!supported || busy}
            onClick={() => inputRef.current?.click()}
            aria-describedby={shownError ? errorId : `${id}-label`}
            className="shrink-0 rounded-lg border border-line-strong bg-surface-3 px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-surface-4 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Adding…" : "Upload image"}
          </button>
        </div>
      )}
      {shownError && (
        <p id={errorId} className="mt-2 text-[12.5px] text-danger">
          {shownError}
        </p>
      )}
    </div>
  );
}
