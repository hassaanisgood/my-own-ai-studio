import { getImageModel, getVideoModel } from "@/config/models";
import type { GenerationRequest } from "./types";

export interface CostEstimate {
  /** Total for the whole request. */
  total: number;
  /** Cost of one output (one image, or the whole clip for video). */
  perOutput: number;
  /** Human-readable breakdown, e.g. "4 × $0.0057" or "5 s × $0.142/s". */
  breakdown: string;
}

/** Mock cost estimate derived from the model catalog. Returns null for unknown models/settings. */
export function estimateCost(request: GenerationRequest): CostEstimate | null {
  if (request.mode === "image") {
    const model = getImageModel(request.modelId);
    const unit = model?.pricePerImage[request.resolution];
    if (unit === undefined) return null;
    const outputs = Math.max(1, request.outputs);
    return {
      total: round(unit * outputs),
      perOutput: unit,
      breakdown: outputs > 1 ? `${outputs} × ${formatCost(unit)}` : `${formatCost(unit)} per image`,
    };
  }
  const model = getVideoModel(request.modelId);
  const perSecond = model?.pricePerSecond[request.resolution];
  if (perSecond === undefined) return null;
  const total = round(perSecond * request.duration);
  return { total, perOutput: total, breakdown: `${request.duration} s × ${formatCost(perSecond)}/s` };
}

function round(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** $0.0057, $0.04, $0.142, $0.71, $1.42 — keeps sub-cent and per-second rates exact. */
export function formatCost(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4).replace(/(\.\d\d\d*?)0+$/, "$1")}`;
}
