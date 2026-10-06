import { getModel } from "@/config/models";
import { mockProvider } from "./mock";
import type { GenerationProvider } from "./types";

/**
 * Provider registry. Models reference a provider by `providerId` in
 * src/config/models.ts. To connect a real service, implement
 * GenerationProvider (keeping credentials on the server, e.g. behind a
 * route handler) and register it here.
 */
const providers: Record<string, GenerationProvider> = {
  [mockProvider.id]: mockProvider,
};

export function getProviderForModel(modelId: string): GenerationProvider {
  const providerId = getModel(modelId)?.providerId ?? "mock";
  return providers[providerId] ?? mockProvider;
}
