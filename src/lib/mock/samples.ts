/**
 * Pre-loaded sample generations so the Generations page isn't empty on first
 * visit. They point at the procedurally rendered assets in /public/mock.
 */
import { estimateCost } from "@/lib/pricing";
import { mockVideoFiles } from "./catalog";
import type { GeneratedAsset, GenerationItem, GenerationRequest } from "@/lib/types";

interface SampleSpec {
  request: GenerationRequest;
  assets: Partial<GeneratedAsset>[];
  minutesAgo: number;
  seed: number;
}

const img = (scene: string, ratio: string, w: number, h: number) => ({ url: `/mock/images/${scene}-${ratio}.jpg`, width: w, height: h });
const vid = (scene: string, ratio: string, secs: number, w: number, h: number) => mockVideoFiles(scene, ratio, secs, w, h);

const SPECS: SampleSpec[] = [
  {
    request: {
      mode: "video",
      modelId: "kling-3-0",
      prompt: "Slow push-in on aurora curtains rippling above a dark mountain ridge, faint stars twinkling, long exposure feel",
      aspectRatio: "16:9",
      resolution: "1080p",
      duration: 5,
      reference: null,
    },
    assets: [vid("aurora", "16x9", 5, 960, 540)],
    minutesAgo: 38,
    seed: 418230,
  },
  {
    request: {
      mode: "image",
      modelId: "higgsfield-soul-2",
      prompt:
        "Editorial still life of a sea-green glazed ceramic vase on a limestone plinth, soft window light from the left, warm plaster wall, 85mm, shallow depth of field",
      aspectRatio: "4:5",
      resolution: "1080p",
      outputs: 1,
    },
    assets: [img("vessel", "4x5", 1080, 1350)],
    minutesAgo: 95,
    seed: 77120,
  },
  {
    request: {
      mode: "image",
      modelId: "qwen-image-3",
      prompt: "Layered alpine ridgelines dissolving into morning fog, cool blue palette, quiet and minimal, large-format landscape photography",
      aspectRatio: "16:9",
      resolution: "2k",
      outputs: 1,
    },
    assets: [img("alpine", "16x9", 1600, 900)],
    minutesAgo: 60 * 5,
    seed: 902114,
  },
  {
    request: {
      mode: "video",
      modelId: "seedance-2-5",
      prompt: "Evening tide rolling in under a setting sun, gentle waves catching warm light, static tripod shot",
      aspectRatio: "9:16",
      resolution: "720p",
      duration: 10,
      reference: null,
    },
    assets: [vid("tide", "9x16", 10, 540, 960)],
    minutesAgo: 60 * 7,
    seed: 551903,
  },
  {
    request: {
      mode: "image",
      modelId: "recraft-v4-1",
      prompt: "Abstract fluid gradient for a brand wallpaper, coral, apricot and electric violet, soft film grain, faint contour lines",
      aspectRatio: "1:1",
      resolution: "1k",
      outputs: 1,
    },
    assets: [img("fluid", "1x1", 1200, 1200)],
    minutesAgo: 60 * 26,
    seed: 130877,
  },
  {
    request: {
      mode: "image",
      modelId: "higgsfield-soul-2",
      prompt: "Three polished chrome spheres resting on a sand-coloured studio floor, softbox reflections, clean product photography",
      aspectRatio: "3:2",
      resolution: "1440p",
      outputs: 1,
    },
    assets: [img("chrome", "3x2", 1500, 1000)],
    minutesAgo: 60 * 29,
    seed: 664501,
  },
  {
    request: {
      mode: "video",
      modelId: "minimax-h3",
      prompt: "Liquid gradient slowly morphing between coral, teal and violet, seamless loop for a title sequence background",
      aspectRatio: "16:9",
      resolution: "768p",
      duration: 5,
      reference: null,
    },
    assets: [vid("liquid", "16x9", 5, 960, 540)],
    minutesAgo: 60 * 30,
    seed: 287713,
  },
  {
    request: {
      mode: "image",
      modelId: "qwen-image-3",
      prompt: "Sunlit terracotta arches opening onto a calm sea, long diagonal shadows across the wall, Mediterranean summer afternoon",
      aspectRatio: "4:5",
      resolution: "1k",
      outputs: 2,
    },
    assets: [img("arches", "4x5", 1080, 1350), img("nocturne", "4x5", 1080, 1350)],
    minutesAgo: 60 * 52,
    seed: 349050,
  },
  {
    request: {
      mode: "image",
      modelId: "higgsfield-soul-2",
      prompt: "Full moon over a still ocean at night, silver reflection path on the water, scattered stars, cinematic wide shot",
      aspectRatio: "9:16",
      resolution: "1080p",
      outputs: 1,
    },
    assets: [img("nocturne", "9x16", 900, 1600)],
    minutesAgo: 60 * 75,
    seed: 812266,
  },
  {
    request: {
      mode: "video",
      modelId: "kling-3-0",
      prompt: "Turntable shot of chrome spheres on a warm studio floor, reflections sweeping across the surfaces, product reveal",
      aspectRatio: "1:1",
      resolution: "720p",
      duration: 10,
      reference: null,
    },
    assets: [vid("orbit", "1x1", 10, 720, 720)],
    minutesAgo: 60 * 98,
    seed: 470032,
  },
  {
    request: {
      mode: "image",
      modelId: "recraft-v4-1",
      prompt: "Symmetrical petal bloom in coral and cream on a deep plum background, layered paper-cut style, centered emblem",
      aspectRatio: "1:1",
      resolution: "2k",
      outputs: 1,
    },
    assets: [img("bloom", "1x1", 1200, 1200)],
    minutesAgo: 60 * 120,
    seed: 95541,
  },
  {
    request: {
      mode: "image",
      modelId: "higgsfield-soul-2",
      prompt: "Rolling desert dunes at dusk, low sun on the horizon, violet sky fading to apricot, fine wind-carved ripples",
      aspectRatio: "16:9",
      resolution: "1080p",
      outputs: 1,
    },
    assets: [img("dunes", "16x9", 1600, 900)],
    minutesAgo: 60 * 122,
    seed: 733018,
  },
];

export const SAMPLE_FAVORITE_IDS = ["sample_1_0", "sample_5_0"];

export function buildSampleHistory(now = Date.now()): GenerationItem[] {
  return SPECS.flatMap((spec, s) => {
    const cost = estimateCost(spec.request)?.perOutput ?? 0;
    const createdAt = new Date(now - spec.minutesAgo * 60_000).toISOString();
    return spec.assets.map((asset, i) => ({
      id: `sample_${s}_${i}`,
      batchId: `sample_${s}`,
      index: i,
      request: spec.request,
      asset: {
        kind: spec.request.mode,
        url: "",
        width: 0,
        height: 0,
        mimeType: spec.request.mode === "video" ? "video/mp4" : "image/jpeg",
        seed: spec.seed + i * 7919,
        ...asset,
      },
      cost,
      createdAt,
      providerId: "mock",
      sample: true,
    }));
  });
}
