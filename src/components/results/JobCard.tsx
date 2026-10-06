"use client";

import { AlertTriangle, Ban, PencilLine, RotateCcw, X } from "lucide-react";
import { getModel } from "@/config/models";
import { resolutionLabel } from "@/lib/drafts";
import { pluralize } from "@/lib/format";
import { formatCost } from "@/lib/pricing";
import type { Job } from "@/lib/types";
import { useStudio } from "@/state/studio-store";
import { useFeedback } from "@/state/feedback";
import { btn } from "@/components/ui/buttons";

export function JobCard({ job }: { job: Job }) {
  const studio = useStudio();
  const { announce } = useFeedback();
  const { request } = job;
  const model = getModel(request.modelId);
  const [rw, rh] = request.aspectRatio.split(":").map(Number);
  const tiles = request.mode === "image" ? request.outputs : 1;
  const active = job.status === "queued" || job.status === "running";
  const pct = Math.round((job.progress ?? 0) * 100);
  const spec =
    request.mode === "image"
      ? `${pluralize(request.outputs, "image")} · ${resolutionLabel(request)} · ${request.aspectRatio}`
      : `${request.duration}s · ${resolutionLabel(request)} · ${request.aspectRatio}`;

  const statusLabel =
    job.status === "queued"
      ? "Queued"
      : job.status === "running"
        ? job.statusMessage ?? "Generating"
        : job.status === "failed"
          ? "Failed"
          : "Canceled";

  return (
    <article
      aria-label={`${statusLabel}: ${spec} with ${model?.name ?? request.modelId}`}
      data-testid="job-card"
      data-status={job.status}
      className={
        "mb-4 overflow-hidden rounded-xl border bg-surface-1 motion-safe:animate-rise " +
        (job.status === "failed" ? "border-danger/35" : "border-line")
      }
    >
      <div className="flex items-start gap-3 px-3.5 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={job.status} label={statusLabel} />
            <span className="text-[12.5px] font-medium text-fg-muted">{model?.name}</span>
            <span className="text-[12px] text-fg-subtle">{spec}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-fg">{request.prompt}</p>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => studio.cancelJob(job.id)}
            className={btn.ghost + " h-8 shrink-0 px-2.5 text-[12.5px]"}
            aria-label={`Cancel generation: ${request.prompt.slice(0, 60)}`}
          >
            <X size={14} aria-hidden /> Cancel
          </button>
        )}
      </div>

      {active && (
        <div className="px-3.5 pt-3">
          <div className="flex items-center justify-between text-[11.5px] text-fg-subtle">
            <span id={`${job.id}-progress-label`}>
              {job.status === "queued" ? "Waiting in queue" : "Simulated progress"}
              <span className="ml-1.5 rounded bg-warn/15 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide text-warn">
                Simulation
              </span>
            </span>
            {job.status === "running" && <span className="font-mono tabular-nums">{pct}%</span>}
          </div>
          <div
            role="progressbar"
            aria-labelledby={`${job.id}-progress-label`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={job.status === "running" ? pct : undefined}
            aria-valuetext={job.status === "running" ? `${pct}% (simulated)` : "Queued"}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]"
          >
            {job.status === "running" ? (
              <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-white/20 motion-safe:animate-shimmer" />
            )}
          </div>
        </div>
      )}

      {active && (
        <div className={"grid gap-2 p-3.5 " + (tiles > 1 ? "grid-cols-2" : "grid-cols-1")} aria-hidden>
          {Array.from({ length: tiles }, (_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg bg-surface-3"
              style={{ aspectRatio: `${rw} / ${rh}`, maxHeight: tiles === 1 ? 360 : undefined }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent motion-safe:animate-shimmer" />
            </div>
          ))}
        </div>
      )}

      {job.status === "failed" && job.error && (
        <div className="m-3.5 mt-3 rounded-lg bg-danger-soft px-3 py-2.5">
          <p className="flex items-start gap-2 text-[13px] text-fg">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <span>
              {job.error.message}
              <span className="block pt-0.5 font-mono text-[11px] text-fg-subtle">
                Code: {job.error.code} · nothing was added to history{job.estimatedCost ? ` · not charged (est. ${formatCost(job.estimatedCost)})` : ""}
              </span>
            </span>
          </p>
        </div>
      )}
      {job.status === "canceled" && (
        <p className="mx-3.5 mt-2 flex items-center gap-2 text-[12.5px] text-fg-subtle">
          <Ban size={13} aria-hidden /> Canceled before completion. Nothing was added to history.
        </p>
      )}

      {!active && (
        <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3.5 pt-3">
          {job.status === "failed" && job.error && !job.error.retryable ? (
            <button
              type="button"
              className={btn.secondary + " h-8 text-[12.5px]"}
              onClick={() => {
                studio.restoreToComposer(request);
                studio.dismissJob(job.id);
                announce("Prompt restored. Edit it and generate again.");
                requestAnimationFrame(() => document.getElementById(`prompt-input-${request.mode}`)?.focus());
              }}
            >
              <PencilLine size={14} aria-hidden /> Edit prompt
            </button>
          ) : (
            <button type="button" className={btn.secondary + " h-8 text-[12.5px]"} onClick={() => studio.retryJob(job.id)}>
              <RotateCcw size={14} aria-hidden /> Retry
            </button>
          )}
          <button type="button" className={btn.ghost + " h-8 text-[12.5px]"} onClick={() => studio.dismissJob(job.id)}>
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}

function StatusPill({ status, label }: { status: Job["status"]; label: string }) {
  const tone =
    status === "failed"
      ? "bg-danger/15 text-danger"
      : status === "canceled"
        ? "bg-white/[0.07] text-fg-muted"
        : status === "queued"
          ? "bg-white/[0.07] text-fg"
          : "bg-accent-soft text-accent";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${tone}`}>
      {(status === "running" || status === "queued") && (
        <span className={"size-1.5 rounded-full motion-safe:animate-pulse " + (status === "running" ? "bg-accent" : "bg-fg-muted")} aria-hidden />
      )}
      {label}
    </span>
  );
}
