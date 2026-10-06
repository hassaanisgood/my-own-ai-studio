import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  getImageModel,
  getVideoModel,
  type ImageModel,
  type VideoModel,
} from "@/config/models";
import type { GenerationRequest, ImageDraft, Mode, VideoDraft } from "./types";

export function defaultImageDraft(modelId?: string): ImageDraft {
  const model = getImageModel(modelId ?? "") ?? IMAGE_MODELS[0];
  return {
    modelId: model.id,
    prompt: "",
    aspectRatio: model.defaults.aspectRatio,
    resolution: model.defaults.resolution,
    outputs: Math.min(2, model.maxOutputs),
  };
}

export function defaultVideoDraft(modelId?: string): VideoDraft {
  const model = getVideoModel(modelId ?? "") ?? VIDEO_MODELS[0];
  return {
    modelId: model.id,
    prompt: "",
    aspectRatio: model.defaults.aspectRatio,
    resolution: model.defaults.resolution,
    duration: model.defaultDuration,
    reference: null,
  };
}

/**
 * Re-targets a draft at a different model, keeping every setting the new model
 * supports and falling back to the model's defaults for the rest.
 * Returns the adjusted draft plus a list of human-readable changes.
 */
export function switchImageModel(draft: ImageDraft, model: ImageModel) {
  const changes: string[] = [];
  const next: ImageDraft = { ...draft, modelId: model.id };
  if (!model.aspectRatios.includes(draft.aspectRatio)) {
    next.aspectRatio = model.defaults.aspectRatio;
    changes.push(`aspect ratio set to ${next.aspectRatio}`);
  }
  if (!(draft.resolution in model.pricePerImage)) {
    next.resolution = model.defaults.resolution;
    changes.push(`resolution set to ${labelFor(model, next.resolution)}`);
  }
  if (draft.outputs > model.maxOutputs) {
    next.outputs = model.maxOutputs;
    changes.push(`outputs limited to ${model.maxOutputs}`);
  }
  return { draft: next, changes };
}

export function switchVideoModel(draft: VideoDraft, model: VideoModel) {
  const changes: string[] = [];
  const next: VideoDraft = { ...draft, modelId: model.id };
  if (!model.aspectRatios.includes(draft.aspectRatio)) {
    next.aspectRatio = model.defaults.aspectRatio;
    changes.push(`aspect ratio set to ${next.aspectRatio}`);
  }
  if (!(draft.resolution in model.pricePerSecond)) {
    next.resolution = model.defaults.resolution;
    changes.push(`resolution set to ${labelFor(model, next.resolution)}`);
  }
  if (!model.durations.includes(draft.duration)) {
    next.duration = model.defaultDuration;
    changes.push(`duration set to ${next.duration} s`);
  }
  return { draft: next, changes };
}

function labelFor(model: ImageModel | VideoModel, resolution: string) {
  return model.resolutions.find((r) => r.id === resolution)?.label ?? resolution;
}

export function requestFromDraft(mode: "image", draft: ImageDraft): GenerationRequest;
export function requestFromDraft(mode: "video", draft: VideoDraft): GenerationRequest;
export function requestFromDraft(mode: Mode, draft: ImageDraft | VideoDraft): GenerationRequest {
  return { ...draft, prompt: draft.prompt.trim(), mode } as GenerationRequest;
}

export function draftFromRequest(request: GenerationRequest): ImageDraft | VideoDraft {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mode, ...draft } = request;
  return draft;
}

export function resolutionLabel(request: GenerationRequest): string {
  const model = request.mode === "image" ? getImageModel(request.modelId) : getVideoModel(request.modelId);
  return model?.resolutions.find((r) => r.id === request.resolution)?.label ?? request.resolution;
}
