/**
 * Generation provider contract.
 *
 * The UI only talks to providers through this interface, so the mock provider
 * can be swapped for a real one (e.g. a provider that POSTs to a Next.js route
 * handler which holds the API key server-side and polls the vendor) without
 * touching any component.
 */
import type { GeneratedAsset, GenerationRequest } from "@/lib/types";

/** Status updates a provider may emit while a job is in flight. */
export type ProviderUpdate =
  | { status: "queued"; position?: number; message?: string }
  | {
      status: "running";
      /** 0..1, omit when the provider can't report progress. */
      progress?: number;
      /** Must be true when `progress` is estimated locally rather than reported by the provider. */
      simulated: boolean;
      message?: string;
    };

export interface ProviderContext {
  signal: AbortSignal;
  onUpdate: (update: ProviderUpdate) => void;
  /** Options that only apply to the mock provider. Real providers ignore them. */
  mock?: { forceFailure: boolean; speed: "realistic" | "fast" };
}

export interface ProviderResult {
  outputs: GeneratedAsset[];
  /** Provider-side job id, kept for support/debugging. */
  providerJobId: string;
}

export interface GenerationProvider {
  id: string;
  label: string;
  /** True when results are placeholders. Drives the "Mock" labels in the UI. */
  isMock: boolean;
  generate(request: GenerationRequest, ctx: ProviderContext): Promise<ProviderResult>;
}

export class GenerationError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = true,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
