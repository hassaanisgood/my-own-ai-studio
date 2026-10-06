export type Mode = "image" | "video";

export type AspectRatio = "1:1" | "4:5" | "3:2" | "16:9" | "9:16";

/** Metadata for an uploaded reference image. The binary lives in IndexedDB under `id`. */
export interface ReferenceImage {
  id: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ImageRequest {
  mode: "image";
  modelId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: string;
  outputs: number;
}

export interface VideoRequest {
  mode: "video";
  modelId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: string;
  duration: number;
  reference: ReferenceImage | null;
}

export type GenerationRequest = ImageRequest | VideoRequest;

export type ImageDraft = Omit<ImageRequest, "mode">;
export type VideoDraft = Omit<VideoRequest, "mode">;

export interface GeneratedAsset {
  kind: Mode;
  url: string;
  posterUrl?: string;
  mimeType: string;
  /** Codec string for the primary file, used to check browser support. */
  codecs?: string;
  /** Same content in other formats, tried in order when the primary can't play. */
  alternates?: { url: string; mimeType: string; codecs?: string }[];
  width: number;
  height: number;
  durationSec?: number;
  seed: number;
}

/** A single completed output. Image batches produce one item per output. */
export interface GenerationItem {
  id: string;
  batchId: string;
  /** Position inside its batch (0-based). */
  index: number;
  request: GenerationRequest;
  asset: GeneratedAsset;
  /** Mock cost attributed to this output, in the studio currency. */
  cost: number;
  createdAt: string;
  providerId: string;
  /** True for the pre-loaded sample generations. */
  sample?: boolean;
}

export type JobStatus = "queued" | "running" | "failed" | "canceled";

export interface JobError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * An in-flight (or just failed/canceled) generation. Jobs never enter history
 * until the provider returns outputs.
 */
export interface Job {
  id: string;
  request: GenerationRequest;
  status: JobStatus;
  /** 0..1 when the provider reports progress. */
  progress?: number;
  /** True when the progress value is simulated rather than reported by a provider. */
  simulated: boolean;
  queuePosition?: number;
  statusMessage?: string;
  error?: JobError;
  createdAt: string;
  estimatedCost: number;
}

export type FailureMode = "off" | "next" | "always";
export type MotionPreference = "system" | "reduce" | "full";
export type MockSpeed = "realistic" | "fast";

export interface Settings {
  defaultImageModel: string;
  defaultVideoModel: string;
  showCostEstimates: boolean;
  loopVideoPreviews: boolean;
  motion: MotionPreference;
  mockFailureMode: FailureMode;
  mockSpeed: MockSpeed;
}
