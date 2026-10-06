import { PROMPT_LIMITS, REFERENCE_LIMITS, getImageModel, getVideoModel } from "@/config/models";
import { formatBytes } from "./format";
import type { GenerationRequest } from "./types";

export type FieldKey = "prompt" | "modelId" | "aspectRatio" | "resolution" | "outputs" | "duration" | "reference";
export type ValidationErrors = Partial<Record<FieldKey, string>>;

/** Validates a request against the shared limits and the selected model's capabilities. */
export function validateRequest(request: GenerationRequest): ValidationErrors {
  const errors: ValidationErrors = {};
  const prompt = request.prompt.trim();
  if (!prompt) errors.prompt = "Describe what you want to generate.";
  else if (prompt.length < PROMPT_LIMITS.min) errors.prompt = `Prompt must be at least ${PROMPT_LIMITS.min} characters.`;
  else if (prompt.length > PROMPT_LIMITS.max)
    errors.prompt = `Prompt is ${prompt.length - PROMPT_LIMITS.max} characters over the ${PROMPT_LIMITS.max} limit.`;

  if (request.mode === "image") {
    const model = getImageModel(request.modelId);
    if (!model) return { ...errors, modelId: "Choose an image model." };
    if (!model.aspectRatios.includes(request.aspectRatio))
      errors.aspectRatio = `${model.name} doesn't support ${request.aspectRatio}.`;
    if (!(request.resolution in model.pricePerImage))
      errors.resolution = `${model.name} doesn't support this resolution.`;
    if (!Number.isInteger(request.outputs) || request.outputs < 1 || request.outputs > model.maxOutputs)
      errors.outputs = `${model.name} can create 1–${model.maxOutputs} images per run.`;
    return errors;
  }

  const model = getVideoModel(request.modelId);
  if (!model) return { ...errors, modelId: "Choose a video model." };
  if (!model.aspectRatios.includes(request.aspectRatio))
    errors.aspectRatio = `${model.name} doesn't support ${request.aspectRatio}.`;
  if (!(request.resolution in model.pricePerSecond)) errors.resolution = `${model.name} doesn't support this resolution.`;
  if (!model.durations.includes(request.duration))
    errors.duration = `${model.name} supports ${model.durations.join(" or ")} second clips.`;
  if (request.reference && !model.supportsImageReference)
    errors.reference = `${model.name} is text-to-video only. Remove the reference or pick another model.`;
  return errors;
}

export function validateReferenceFile(file: File): string | null {
  if (!(REFERENCE_LIMITS.types as readonly string[]).includes(file.type))
    return "Use a PNG, JPEG or WebP image.";
  if (file.size > REFERENCE_LIMITS.maxBytes)
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(REFERENCE_LIMITS.maxBytes)}.`;
  return null;
}

export const FIELD_ORDER: FieldKey[] = ["prompt", "modelId", "reference", "aspectRatio", "resolution", "duration", "outputs"];
