"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import type { ModelDefinition } from "@/config/models";
import { formatCost, type CostEstimate } from "@/lib/pricing";
import { btn } from "@/components/ui/buttons";

interface Props {
  model: ModelDefinition | undefined;
  specs: string;
  estimate: CostEstimate | null;
  showCost: boolean;
  activeCount: number;
  onGenerate: () => void;
  blockedReason?: string | null;
}

export function GenerateBar({ model, specs, estimate, showCost, activeCount, onGenerate, blockedReason }: Props) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-canvas/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pb-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1" aria-live="off">
          <p className="truncate text-[14px] text-fg" title={model?.description}>
            <span className="font-semibold">{model?.name ?? "Select a model"}</span>
            {model && <span className="hidden text-fg-subtle xl:inline"> — {model.description}</span>}
          </p>
          <p className="truncate text-[12.5px] text-fg-muted">{specs}</p>
          {showCost && (
            <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
              <span className="text-fg-muted">Estimated cost:</span>
              <span className="font-mono font-medium text-fg" data-testid="estimated-cost">
                {estimate ? formatCost(estimate.total) : "—"}
              </span>
              <span className="rounded bg-warn/15 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-warn">
                Mock
              </span>
              {estimate && <span className="hidden truncate text-fg-subtle sm:inline lg:hidden xl:inline">{estimate.breakdown}</span>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className={btn.primary + " h-12 shrink-0 px-5 text-[15px] shadow-lg shadow-accent/10"}
          aria-describedby={blockedReason ? "generate-blocked" : undefined}
        >
          {activeCount > 0 ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <ArrowUp size={17} strokeWidth={2.5} aria-hidden />}
          Generate
        </button>
      </div>
      {blockedReason && (
        <p id="generate-blocked" className="mt-2 text-[12.5px] text-warn">
          {blockedReason}
        </p>
      )}
    </div>
  );
}
