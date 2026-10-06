import { hashString, createId } from "@/lib/id";
import { mockImageAsset, mockVideoAsset } from "@/lib/mock/catalog";
import type { GeneratedAsset, GenerationRequest } from "@/lib/types";
import { getModel } from "@/config/models";
import { GenerationError, type GenerationProvider, type ProviderContext } from "./types";

/**
 * Deterministic failure triggers for testing. Put one of these anywhere in a
 * prompt and the mock provider will fail the job with the matching error.
 */
export const MOCK_FAILURE_TOKENS: Record<string, { code: string; message: string; retryable: boolean }> = {
  "[fail]": { code: "provider_error", message: "The model provider returned an error (simulated).", retryable: true },
  "[fail:timeout]": { code: "timeout", message: "The provider didn't respond in time (simulated).", retryable: true },
  "[fail:policy]": {
    code: "content_policy",
    message: "The prompt was blocked by the provider's content policy (simulated). Edit the prompt to continue.",
    retryable: false,
  },
};

function failureFor(prompt: string) {
  const text = prompt.toLowerCase();
  // Longest token first so "[fail:policy]" isn't read as "[fail]".
  const token = Object.keys(MOCK_FAILURE_TOKENS)
    .sort((a, b) => b.length - a.length)
    .find((t) => text.includes(t));
  return token ? MOCK_FAILURE_TOKENS[token] : null;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Ease-out curve so simulated progress slows down near the end, like real jobs. */
const ease = (t: number) => 1 - Math.pow(1 - t, 2.2);

export const mockProvider: GenerationProvider = {
  id: "mock",
  label: "Mock provider",
  isMock: true,

  async generate(request: GenerationRequest, ctx: ProviderContext) {
    const { signal, onUpdate } = ctx;
    const fast = ctx.mock?.speed === "fast";
    const scale = fast ? 0.3 : 1;
    const model = getModel(request.modelId);
    const seed = hashString(`${request.prompt}|${request.modelId}|${Date.now()}`) % 1_000_000;

    // 1. Queue
    onUpdate({ status: "queued", position: 1, message: "Waiting for a mock worker" });
    await wait((700 + (seed % 500)) * scale, signal);

    // 2. Run with simulated progress
    const typical = (model?.typicalSeconds ?? 6) * 1000;
    const total = Math.round((request.mode === "video" ? typical * 0.55 : typical * 0.6) * scale);
    const failure = ctx.mock?.forceFailure
      ? { code: "provider_error", message: "Simulated failure from Settings → Mock provider.", retryable: true }
      : failureFor(request.prompt);
    const failAt = failure ? 0.35 + (seed % 30) / 100 : 1;

    const tick = 160;
    const started = performance.now();
    onUpdate({ status: "running", progress: 0, simulated: true, message: "Generating" });
    for (;;) {
      await wait(tick, signal);
      const t = Math.min(1, (performance.now() - started) / total);
      if (t >= failAt && failure) throw new GenerationError(failure.code, failure.message, failure.retryable);
      onUpdate({
        status: "running",
        progress: Math.min(0.99, ease(t)),
        simulated: true,
        message: t > 0.85 ? "Finalizing" : "Generating",
      });
      if (t >= 1) break;
    }
    await wait(200 * scale, signal);

    return { outputs: buildOutputs(request, seed), providerJobId: createId("mockjob") };
  },
};

export function buildOutputs(request: GenerationRequest, seed: number): GeneratedAsset[] {
  if (request.mode === "image") {
    return Array.from({ length: request.outputs }, (_, i) => ({
      kind: "image" as const,
      ...mockImageAsset(request.prompt, request.aspectRatio, i),
      seed: (seed + i * 7919) % 1_000_000,
    }));
  }
  return [{ kind: "video", ...mockVideoAsset(request.prompt, request.aspectRatio, request.duration), seed }];
}
