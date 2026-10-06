/**
 * Catalog of the original, procedurally rendered placeholder assets in
 * /public/mock (see scripts/generate_assets.py). The mock provider picks from
 * here; nothing in this file is used once a real provider is connected.
 */
import type { AspectRatio } from "@/lib/types";
import { hashString } from "@/lib/id";

interface Scene {
  id: string;
  title: string;
  keywords: string[];
}

export const IMAGE_SCENES: Scene[] = [
  { id: "dunes", title: "Dusk dunes", keywords: ["dune", "desert", "sand", "sunset", "dusk", "warm", "sahara"] },
  { id: "alpine", title: "Alpine mist", keywords: ["mountain", "alpine", "fog", "mist", "peak", "ridge", "snow", "forest"] },
  { id: "fluid", title: "Fluid gradient", keywords: ["abstract", "gradient", "fluid", "liquid", "color", "colour", "wallpaper", "mesh"] },
  { id: "chrome", title: "Chrome spheres", keywords: ["chrome", "metal", "sphere", "reflect", "3d", "render", "glass", "orb"] },
  { id: "vessel", title: "Ceramic vessel", keywords: ["product", "vase", "ceramic", "bottle", "packshot", "still life", "pedestal", "plinth", "studio"] },
  { id: "arches", title: "Coastal arches", keywords: ["arch", "architecture", "building", "terracotta", "mediterranean", "wall", "interior"] },
  { id: "nocturne", title: "Moonlit sea", keywords: ["ocean", "sea", "moon", "night", "water", "lake", "coast", "star"] },
  { id: "bloom", title: "Petal bloom", keywords: ["flower", "bloom", "petal", "botanical", "floral", "pattern", "mandala", "logo"] },
];

export const VIDEO_SCENES: Scene[] = [
  { id: "aurora", title: "Aurora ridge", keywords: ["aurora", "night", "sky", "star", "mountain", "northern", "light"] },
  { id: "liquid", title: "Liquid color", keywords: ["abstract", "gradient", "fluid", "liquid", "color", "colour", "loop", "motion"] },
  { id: "orbit", title: "Chrome orbit", keywords: ["chrome", "product", "sphere", "metal", "orbit", "3d", "studio", "turntable"] },
  { id: "tide", title: "Evening tide", keywords: ["ocean", "sea", "sunset", "wave", "water", "beach", "tide", "dusk"] },
];

const IMAGE_SIZES: Record<AspectRatio, [number, number]> = {
  "1:1": [1200, 1200],
  "4:5": [1080, 1350],
  "3:2": [1500, 1000],
  "16:9": [1600, 900],
  "9:16": [900, 1600],
};

const VIDEO_SIZES: Partial<Record<AspectRatio, [number, number]>> = {
  "16:9": [960, 540],
  "9:16": [540, 960],
  "1:1": [720, 720],
};

const ratioKey = (r: AspectRatio) => r.replace(":", "x");

/** Prefer scenes whose keywords appear in the prompt; otherwise pick deterministically. */
function pickScene(scenes: Scene[], prompt: string, index: number): Scene {
  const text = prompt.toLowerCase();
  const scored = scenes
    .map((scene) => ({ scene, score: scene.keywords.filter((k) => text.includes(k)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const pool = scored.length ? scored.map((s) => s.scene) : scenes;
  // Spread multiple outputs across matching scenes, then the rest of the catalog.
  const ordered = [...pool, ...scenes.filter((s) => !pool.includes(s))];
  const start = scored.length ? 0 : hashString(prompt) % scenes.length;
  return ordered[(start + index) % ordered.length];
}

export function mockImageAsset(prompt: string, aspectRatio: AspectRatio, index: number) {
  const scene = pickScene(IMAGE_SCENES, prompt, index);
  const [width, height] = IMAGE_SIZES[aspectRatio];
  return { url: `/mock/images/${scene.id}-${ratioKey(aspectRatio)}.jpg`, width, height, mimeType: "image/jpeg" };
}

export function mockVideoAsset(prompt: string, aspectRatio: AspectRatio, duration: number) {
  const scene = pickScene(VIDEO_SCENES, prompt, 0);
  const size = VIDEO_SIZES[aspectRatio] ?? VIDEO_SIZES["16:9"]!;
  const ratio = VIDEO_SIZES[aspectRatio] ? ratioKey(aspectRatio) : "16x9";
  const clip = duration >= 10 ? 10 : 5;
  return mockVideoFiles(scene.id, ratio, clip, size[0], size[1]);
}

export function mockVideoFiles(scene: string, ratio: string, clip: number, width: number, height: number) {
  const base = `/mock/videos/${scene}-${ratio}-${clip}s`;
  return {
    url: `${base}.mp4`,
    codecs: "avc1.64001F",
    alternates: [{ url: `${base}.webm`, mimeType: "video/webm", codecs: "vp9" }],
    posterUrl: `/mock/videos/${scene}-${ratio}.jpg`,
    width,
    height,
    mimeType: "video/mp4",
    durationSec: clip,
  };
}
