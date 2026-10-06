/**
 * Model catalog.
 *
 * IMPORTANT: every model name, capability and price below is illustrative mock
 * configuration. None of it reflects verified availability or real pricing.
 *
 * To add a model, append an entry to IMAGE_MODELS or VIDEO_MODELS. The UI,
 * validation and cost estimates are derived from these definitions, so no
 * component changes are needed. `providerId` selects the generation provider
 * (see src/lib/providers/registry.ts).
 */
import type { AspectRatio, Mode } from "@/lib/types";

export interface ResolutionOption {
  id: string;
  label: string;
  /** Short hint shown under the label, e.g. pixel dimensions. */
  hint?: string;
}

interface BaseModel {
  id: string;
  kind: Mode;
  name: string;
  /** Organisation shown in small print. Text only — no third-party logos. */
  maker: string;
  description: string;
  /** One or two short capability tags. */
  tags: string[];
  providerId: string;
  aspectRatios: AspectRatio[];
  resolutions: ResolutionOption[];
  defaults: { aspectRatio: AspectRatio; resolution: string };
  /** Rough mock turnaround, used only for copy. */
  typicalSeconds: number;
}

export interface ImageModel extends BaseModel {
  kind: "image";
  maxOutputs: number;
  /** Mock price per generated image, keyed by resolution id. */
  pricePerImage: Record<string, number>;
}

export interface VideoModel extends BaseModel {
  kind: "video";
  durations: number[];
  defaultDuration: number;
  supportsImageReference: boolean;
  /** Mock price per second of output, keyed by resolution id. */
  pricePerSecond: Record<string, number>;
}

export type ModelDefinition = ImageModel | VideoModel;

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "higgsfield-soul-2",
    kind: "image",
    name: "Higgsfield Soul 2",
    maker: "Higgsfield",
    description: "Photoreal fashion and editorial imagery with natural skin, fabric and light.",
    tags: ["Photoreal", "Editorial"],
    providerId: "mock",
    aspectRatios: ["1:1", "4:5", "3:2", "16:9", "9:16"],
    resolutions: [
      { id: "720p", label: "720p", hint: "Draft" },
      { id: "1080p", label: "1080p", hint: "Standard" },
      { id: "1440p", label: "1440p", hint: "High" },
    ],
    defaults: { aspectRatio: "4:5", resolution: "1080p" },
    maxOutputs: 4,
    pricePerImage: { "720p": 0.0038, "1080p": 0.0057, "1440p": 0.0102 },
    typicalSeconds: 6,
  },
  {
    id: "qwen-image-3",
    kind: "image",
    name: "Qwen Image 3",
    maker: "Qwen",
    description: "Precise prompt adherence with clean in-image typography and layouts.",
    tags: ["Prompt adherence", "Typography"],
    providerId: "mock",
    aspectRatios: ["1:1", "4:5", "3:2", "16:9", "9:16"],
    resolutions: [
      { id: "1k", label: "1K", hint: "1024 px" },
      { id: "2k", label: "2K", hint: "2048 px" },
    ],
    defaults: { aspectRatio: "1:1", resolution: "1k" },
    maxOutputs: 4,
    pricePerImage: { "1k": 0.004, "2k": 0.009 },
    typicalSeconds: 5,
  },
  {
    id: "recraft-v4-1",
    kind: "image",
    name: "Recraft V4.1",
    maker: "Recraft",
    description: "Design-forward compositions for brand, product and layout work.",
    tags: ["Design", "Brand"],
    providerId: "mock",
    aspectRatios: ["1:1", "4:5", "3:2", "16:9"],
    resolutions: [
      { id: "1k", label: "1K", hint: "1024 px" },
      { id: "2k", label: "2K", hint: "2048 px" },
    ],
    defaults: { aspectRatio: "1:1", resolution: "1k" },
    maxOutputs: 2,
    pricePerImage: { "1k": 0.04, "2k": 0.08 },
    typicalSeconds: 8,
  },
];

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "kling-3-0",
    kind: "video",
    name: "Kling 3.0",
    maker: "Kling",
    description: "Cinematic motion with strong physics and steady camera moves.",
    tags: ["Cinematic", "Image-to-video"],
    providerId: "mock",
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: [
      { id: "720p", label: "720p" },
      { id: "1080p", label: "1080p" },
    ],
    defaults: { aspectRatio: "16:9", resolution: "1080p" },
    durations: [5, 10],
    defaultDuration: 5,
    supportsImageReference: true,
    pricePerSecond: { "720p": 0.084, "1080p": 0.142 },
    typicalSeconds: 12,
  },
  {
    id: "seedance-2-5",
    kind: "video",
    name: "Seedance 2.5",
    maker: "Seedance",
    description: "Fluid multi-shot sequences with expressive, choreographed movement.",
    tags: ["Multi-shot", "Image-to-video"],
    providerId: "mock",
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: [
      { id: "480p", label: "480p" },
      { id: "720p", label: "720p" },
      { id: "1080p", label: "1080p" },
    ],
    defaults: { aspectRatio: "16:9", resolution: "720p" },
    durations: [5, 10],
    defaultDuration: 5,
    supportsImageReference: true,
    pricePerSecond: { "480p": 0.032, "720p": 0.065, "1080p": 0.118 },
    typicalSeconds: 10,
  },
  {
    id: "minimax-h3",
    kind: "video",
    name: "MiniMax H3",
    maker: "MiniMax",
    description: "Fast text-to-video drafts for exploring motion ideas.",
    tags: ["Fast", "Text-to-video"],
    providerId: "mock",
    aspectRatios: ["16:9", "9:16"],
    resolutions: [
      { id: "768p", label: "768p" },
      { id: "1080p", label: "1080p" },
    ],
    defaults: { aspectRatio: "16:9", resolution: "768p" },
    durations: [5, 10],
    defaultDuration: 5,
    supportsImageReference: false,
    pricePerSecond: { "768p": 0.056, "1080p": 0.092 },
    typicalSeconds: 8,
  },
];

export const ALL_MODELS: ModelDefinition[] = [...IMAGE_MODELS, ...VIDEO_MODELS];

export const MODELS_BY_ID: Record<string, ModelDefinition> = Object.fromEntries(
  ALL_MODELS.map((m) => [m.id, m]),
);

export function getModel(id: string): ModelDefinition | undefined {
  return MODELS_BY_ID[id];
}

export function getImageModel(id: string): ImageModel | undefined {
  const m = MODELS_BY_ID[id];
  return m?.kind === "image" ? m : undefined;
}

export function getVideoModel(id: string): VideoModel | undefined {
  const m = MODELS_BY_ID[id];
  return m?.kind === "video" ? m : undefined;
}

export function modelsFor(mode: Mode): ModelDefinition[] {
  return mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
}

const RATIO_ORDER: AspectRatio[] = ["1:1", "4:5", "3:2", "16:9", "9:16"];

/** Every aspect ratio offered by at least one model of the given kind, in display order. */
export function aspectRatiosFor(mode: Mode): AspectRatio[] {
  const used = new Set(modelsFor(mode).flatMap((m) => m.aspectRatios));
  return RATIO_ORDER.filter((r) => used.has(r));
}

/** Largest output count offered by any image model. */
export const MAX_IMAGE_OUTPUTS = Math.max(...IMAGE_MODELS.map((m) => m.maxOutputs));

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "Square",
  "4:5": "Portrait",
  "3:2": "Classic",
  "16:9": "Wide",
  "9:16": "Vertical",
};

/** Limits shared by every model. */
export const PROMPT_LIMITS = { min: 3, max: 1500 } as const;
export const REFERENCE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  types: ["image/png", "image/jpeg", "image/webp"],
} as const;
export const MAX_ACTIVE_JOBS = 4;
