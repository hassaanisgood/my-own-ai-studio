"use client";

import { useMemo, useRef, useState } from "react";
import {
  ASPECT_RATIO_LABELS,
  IMAGE_MODELS,
  MAX_IMAGE_OUTPUTS,
  aspectRatiosFor,
  VIDEO_MODELS,
  getImageModel,
  getVideoModel,
} from "@/config/models";
import { requestFromDraft, switchImageModel, switchVideoModel } from "@/lib/drafts";
import { pluralize } from "@/lib/format";
import { estimateCost, formatCost } from "@/lib/pricing";
import type { GenerationRequest, Mode } from "@/lib/types";
import { FIELD_ORDER, validateRequest, type FieldKey, type ValidationErrors } from "@/lib/validation";
import { useFeedback } from "@/state/feedback";
import { useStudio } from "@/state/studio-store";
import { AspectIcon } from "@/components/ui/AspectIcon";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { GenerateBar } from "./GenerateBar";
import { ModelPicker } from "./ModelPicker";
import { PromptField } from "./PromptField";
import { ReferenceUpload } from "./ReferenceUpload";

const fieldId = (mode: Mode, key: FieldKey) =>
  key === "prompt" ? `prompt-input-${mode}` : `${mode}-${key}`;

/** Moves focus to the first invalid control so keyboard users land on the problem. */
function focusField(mode: Mode, key: FieldKey) {
  const el = document.getElementById(fieldId(mode, key));
  if (!el) return;
  if (el instanceof HTMLFieldSetElement) {
    const input = el.querySelector<HTMLInputElement>("input:checked:not(:disabled)") ?? el.querySelector<HTMLInputElement>("input:not(:disabled)");
    input?.focus();
  } else {
    el.focus();
  }
}

export function Composer({ onStarted }: { onStarted?: (jobId: string) => void }) {
  const studio = useStudio();
  const { announce } = useFeedback();
  const { mode, drafts, settings, jobs } = studio.state;
  const [attempted, setAttempted] = useState<Record<Mode, boolean>>({ image: false, video: false });
  const [modelNote, setModelNote] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const request: GenerationRequest = useMemo(
    () => (mode === "image" ? requestFromDraft("image", drafts.image) : requestFromDraft("video", drafts.video)),
    [mode, drafts],
  );
  const liveErrors = useMemo(() => validateRequest(request), [request]);
  // Show every error after a submit attempt; capability conflicts (reference) show immediately.
  const errors: ValidationErrors = attempted[mode] ? liveErrors : { reference: liveErrors.reference };
  const estimate = estimateCost(request);
  const activeCount = jobs.filter((j) => j.status === "queued" || j.status === "running").length;

  const submit = () => {
    const result = studio.generate(request);
    if (result.ok) {
      setAttempted((a) => ({ ...a, [mode]: false }));
      setBlocked(null);
      onStarted?.(result.jobId);
      return;
    }
    if (result.reason) {
      setBlocked(result.reason);
      return;
    }
    setAttempted((a) => ({ ...a, [mode]: true }));
    const first = FIELD_ORDER.find((k) => result.errors[k]);
    if (first) {
      const count = Object.keys(result.errors).length;
      announce(`Can't generate yet. ${result.errors[first]}${count > 1 ? ` ${count - 1} more issue${count > 2 ? "s" : ""}.` : ""}`, "assertive");
      requestAnimationFrame(() => focusField(mode, first));
    }
  };

  // ---------------------------------------------------------------- image
  if (mode === "image") {
    const draft = drafts.image;
    const model = getImageModel(draft.modelId);
    const specs = model
      ? `${model.resolutions.find((r) => r.id === draft.resolution)?.label ?? draft.resolution} · ${draft.aspectRatio} · ${pluralize(draft.outputs, "image")}`
      : "";
    return (
      <div className="flex flex-col gap-7">
        <PromptField
          ref={promptRef}
          mode="image"
          value={draft.prompt}
          onChange={(prompt) => studio.patchImageDraft({ prompt })}
          onSubmit={submit}
          error={errors.prompt}
        />
        <ModelPicker
          id={fieldId("image", "modelId")}
          name="image-model"
          models={IMAGE_MODELS}
          value={draft.modelId}
          showCost={settings.showCostEstimates}
          note={modelNote}
          onChange={(id) => {
            const next = getImageModel(id);
            if (!next) return;
            const { draft: adjusted, changes } = switchImageModel(draft, next);
            studio.replaceDraft("image", adjusted);
            setModelNote(changes.length ? `Adjusted for ${next.name}: ${changes.join(", ")}.` : null);
          }}
        />
        {model && (
          <div className="grid gap-6">
            <OptionGroup
              id={fieldId("image", "aspectRatio")}
              legend="Aspect ratio"
              name="image-aspect"
              aside={ASPECT_RATIO_LABELS[draft.aspectRatio]}
              value={draft.aspectRatio}
              onChange={(aspectRatio) => studio.patchImageDraft({ aspectRatio })}
              error={errors.aspectRatio}
              options={aspectRatiosFor("image").map((r) => ({
                value: r,
                label: r,
                icon: <AspectIcon ratio={r} />,
                ariaLabel: `${r} ${ASPECT_RATIO_LABELS[r]}${model.aspectRatios.includes(r) ? "" : " (not supported by this model)"}`,
                disabled: !model.aspectRatios.includes(r),
              }))}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <OptionGroup
                id={fieldId("image", "resolution")}
                legend="Resolution"
                name="image-resolution"
                value={draft.resolution}
                onChange={(resolution) => studio.patchImageDraft({ resolution })}
                error={errors.resolution}
                options={model.resolutions.map((r) => ({
                  value: r.id,
                  label: r.label,
                  hint: settings.showCostEstimates ? formatCost(model.pricePerImage[r.id]) : r.hint,
                }))}
              />
              <OptionGroup
                id={fieldId("image", "outputs")}
                legend="Outputs"
                name="image-outputs"
                aside={`Max ${model.maxOutputs}`}
                value={draft.outputs}
                onChange={(outputs) => studio.patchImageDraft({ outputs })}
                error={errors.outputs}
                options={Array.from({ length: MAX_IMAGE_OUTPUTS }, (_, i) => i + 1).map((n) => ({
                  value: n,
                  label: String(n),
                  ariaLabel: `${pluralize(n, "image")}${n > model.maxOutputs ? " (not supported by this model)" : ""}`,
                  disabled: n > model.maxOutputs,
                }))}
              />
            </div>
          </div>
        )}
        <GenerateBar
          model={model}
          specs={specs}
          estimate={estimate}
          showCost={settings.showCostEstimates}
          activeCount={activeCount}
          onGenerate={submit}
          blockedReason={blocked}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- video
  const draft = drafts.video;
  const model = getVideoModel(draft.modelId);
  const specs = model
    ? `${draft.duration} seconds · ${model.resolutions.find((r) => r.id === draft.resolution)?.label ?? draft.resolution} · ${draft.aspectRatio}${draft.reference ? " · from image" : ""}`
    : "";
  return (
    <div className="flex flex-col gap-7">
      <PromptField
        ref={promptRef}
        mode="video"
        value={draft.prompt}
        onChange={(prompt) => studio.patchVideoDraft({ prompt })}
        onSubmit={submit}
        error={errors.prompt}
      />
      <ModelPicker
        id={fieldId("video", "modelId")}
        name="video-model"
        models={VIDEO_MODELS}
        value={draft.modelId}
        showCost={settings.showCostEstimates}
        note={modelNote}
        onChange={(id) => {
          const next = getVideoModel(id);
          if (!next) return;
          const { draft: adjusted, changes } = switchVideoModel(draft, next);
          studio.replaceDraft("video", adjusted);
          setModelNote(changes.length ? `Adjusted for ${next.name}: ${changes.join(", ")}.` : null);
        }}
      />
      {model && (
        <div className="grid gap-6">
          <ReferenceUpload
            id={fieldId("video", "reference")}
            value={draft.reference}
            onChange={(reference) => studio.patchVideoDraft({ reference })}
            supported={model.supportsImageReference}
            modelName={model.name}
            error={errors.reference}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <OptionGroup
              id={fieldId("video", "duration")}
              legend="Duration"
              name="video-duration"
              value={draft.duration}
              onChange={(duration) => studio.patchVideoDraft({ duration })}
              error={errors.duration}
              options={model.durations.map((d) => ({
                value: d,
                label: `${d} s`,
                ariaLabel: `${d} seconds`,
              }))}
            />
            <OptionGroup
              id={fieldId("video", "resolution")}
              legend="Resolution"
              name="video-resolution"
              value={draft.resolution}
              onChange={(resolution) => studio.patchVideoDraft({ resolution })}
              error={errors.resolution}
              options={model.resolutions.map((r) => ({
                value: r.id,
                label: r.label,
                hint: settings.showCostEstimates ? `${formatCost(model.pricePerSecond[r.id])}/s` : undefined,
              }))}
            />
          </div>
          <OptionGroup
            id={fieldId("video", "aspectRatio")}
            legend="Aspect ratio"
            name="video-aspect"
            aside={ASPECT_RATIO_LABELS[draft.aspectRatio]}
            value={draft.aspectRatio}
            onChange={(aspectRatio) => studio.patchVideoDraft({ aspectRatio })}
            error={errors.aspectRatio}
            options={aspectRatiosFor("video").map((r) => ({
              value: r,
              label: r,
              icon: <AspectIcon ratio={r} />,
              ariaLabel: `${r} ${ASPECT_RATIO_LABELS[r]}${model.aspectRatios.includes(r) ? "" : " (not supported by this model)"}`,
              disabled: !model.aspectRatios.includes(r),
            }))}
          />
        </div>
      )}
      <GenerateBar
        model={model}
        specs={specs}
        estimate={estimate}
        showCost={settings.showCostEstimates}
        activeCount={activeCount}
        onGenerate={submit}
        blockedReason={blocked}
      />
    </div>
  );
}
