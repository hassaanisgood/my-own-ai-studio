"use client";

import { Check } from "lucide-react";
import type { ModelDefinition } from "@/config/models";
import { formatCost } from "@/lib/pricing";

function startingPrice(model: ModelDefinition) {
  if (model.kind === "image") return `from ${formatCost(Math.min(...Object.values(model.pricePerImage)))} / image`;
  return `from ${formatCost(Math.min(...Object.values(model.pricePerSecond)))} / sec`;
}

interface Props {
  name: string;
  models: ModelDefinition[];
  value: string;
  onChange: (id: string) => void;
  showCost: boolean;
  note?: string | null;
  id?: string;
}

export function ModelPicker({ name, models, value, onChange, showCost, note, id }: Props) {
  return (
    <fieldset id={id} className="min-w-0">
      <legend className="mb-2 text-[12.5px] font-medium text-fg-muted">Model</legend>
      <div className="flex flex-col gap-1.5">
        {models.map((model) => {
          const checked = model.id === value;
          const inputId = `${name}-${model.id}`;
          return (
            <label
              key={model.id}
              htmlFor={inputId}
              className={
                "group relative flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors " +
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent " +
                (checked ? "border-accent/55 bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong")
              }
            >
              <input
                type="radio"
                id={inputId}
                name={name}
                value={model.id}
                checked={checked}
                onChange={() => onChange(model.id)}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-xl opacity-0"
                aria-describedby={`${inputId}-desc`}
              />
              <span
                className={
                  "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors " +
                  (checked ? "border-accent bg-accent text-accent-ink" : "border-line-strong")
                }
                aria-hidden
              >
                {checked && <Check size={11} strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-[14px] font-semibold text-fg">{model.name}</span>
                  {showCost && (
                    <span className="font-mono text-[11.5px] text-fg-subtle">
                      {startingPrice(model)}
                    </span>
                  )}
                </span>
                <span id={`${inputId}-desc`} className="mt-1 block text-[13px] leading-snug text-fg-muted">
                  {model.description}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
                  {model.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-fg-subtle">
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p role="status" className="mt-2 min-h-0 text-[12.5px] text-warn empty:hidden">
        {note}
      </p>
    </fieldset>
  );
}
