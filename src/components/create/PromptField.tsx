"use client";

import { forwardRef } from "react";
import { Shuffle, X } from "lucide-react";
import { PROMPT_LIMITS } from "@/config/models";
import type { Mode } from "@/lib/types";

const EXAMPLES: Record<Mode, string[]> = {
  image: [
    "Sea-green ceramic vase on a limestone plinth, soft window light, warm plaster wall, editorial still life",
    "Rolling desert dunes at dusk, violet sky fading to apricot, fine wind-carved ripples, large-format photograph",
    "Three chrome spheres on a sand-coloured studio floor, softbox reflections, minimal product render",
    "Terracotta arches opening onto a calm sea, long diagonal shadows, Mediterranean afternoon",
  ],
  video: [
    "Slow push-in on aurora curtains rippling above a dark mountain ridge, stars twinkling",
    "Evening tide rolling in under a setting sun, gentle waves catching warm light, locked-off tripod shot",
    "Turntable shot of chrome spheres on a warm studio floor, reflections sweeping across the surfaces",
    "Liquid gradient morphing between coral, teal and violet, seamless loop for a title sequence",
  ],
};

interface Props {
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
}

export const PromptField = forwardRef<HTMLTextAreaElement, Props>(function PromptField(
  { mode, value, onChange, onSubmit, error },
  ref,
) {
  const id = `prompt-input-${mode}`;
  const length = value.trim().length;
  const over = length > PROMPT_LIMITS.max;
  const examples = EXAMPLES[mode];

  const shuffle = () => {
    const current = examples.indexOf(value);
    onChange(examples[(current + 1) % examples.length]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-[12.5px] font-medium text-fg-muted">
          Prompt
        </label>
        <button
          type="button"
          onClick={shuffle}
          className="-my-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-fg-subtle hover:bg-white/5 hover:text-fg"
        >
          <Shuffle size={13} aria-hidden /> Try an example
        </button>
      </div>
      <div
        className={
          "group relative rounded-xl border bg-surface-2 transition-colors focus-within:border-line-strong focus-within:bg-surface-3/60 " +
          (error ? "border-danger/60" : "border-line")
        }
      >
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={5}
          placeholder={
            mode === "image"
              ? "Describe the image — subject, setting, light, lens, mood…"
              : "Describe the shot — subject, motion, camera move, pacing…"
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className="block max-h-[22rem] min-h-[8.5rem] w-full resize-none bg-transparent px-4 pb-10 pt-3.5 text-[15px] leading-relaxed text-fg outline-none [field-sizing:content] focus-visible:outline-none"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 pb-2.5">
          <span id={`${id}-hint`} className="text-[11.5px] text-fg-subtle">
            <span className="hidden sm:inline">
              <kbd className="font-sans">Ctrl</kbd> / <kbd className="font-sans">⌘</kbd> + <kbd className="font-sans">Enter</kbd> to generate
            </span>
            <span className="sr-only sm:hidden">Press Control or Command plus Enter to generate.</span>
          </span>
          <span className="pointer-events-auto flex items-center gap-1">
            <span className={"font-mono text-[11px] tabular-nums " + (over ? "text-danger" : "text-fg-subtle")}>
              {length}/{PROMPT_LIMITS.max}
            </span>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="grid size-6 place-items-center rounded-md text-fg-subtle hover:bg-white/5 hover:text-fg"
                aria-label="Clear prompt"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </span>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
