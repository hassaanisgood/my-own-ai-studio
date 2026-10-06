"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { MAX_ACTIVE_JOBS, getImageModel, getModel, getVideoModel } from "@/config/models";
import { defaultImageDraft, defaultVideoDraft, draftFromRequest } from "@/lib/drafts";
import { pluralize } from "@/lib/format";
import { createId } from "@/lib/id";
import { SAMPLE_FAVORITE_IDS, buildSampleHistory } from "@/lib/mock/samples";
import { estimateCost } from "@/lib/pricing";
import { getProviderForModel } from "@/lib/providers/registry";
import { GenerationError, isAbortError } from "@/lib/providers/types";
import { pruneReferences } from "@/lib/storage/idb";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage/local";
import type {
  GenerationItem,
  GenerationRequest,
  ImageDraft,
  Job,
  Mode,
  Settings,
  VideoDraft,
} from "@/lib/types";
import { validateRequest, type ValidationErrors } from "@/lib/validation";
import { useFeedback } from "./feedback";

export const DEFAULT_SETTINGS: Settings = {
  defaultImageModel: "higgsfield-soul-2",
  defaultVideoModel: "kling-3-0",
  showCostEstimates: true,
  loopVideoPreviews: false,
  motion: "system",
  mockFailureMode: "off",
  mockSpeed: "realistic",
};

interface Drafts {
  image: ImageDraft;
  video: VideoDraft;
}

interface State {
  hydrated: boolean;
  mode: Mode;
  drafts: Drafts;
  history: GenerationItem[];
  favorites: string[];
  jobs: Job[];
  settings: Settings;
  storageError: string | null;
  /** Batch ids completed during this session, used to highlight fresh results. */
  freshBatches: string[];
}

type Action =
  | { type: "hydrate"; state: Partial<State> }
  | { type: "setMode"; mode: Mode }
  | { type: "patchDraft"; mode: "image"; patch: Partial<ImageDraft> }
  | { type: "patchDraft"; mode: "video"; patch: Partial<VideoDraft> }
  | { type: "replaceDraft"; mode: Mode; draft: ImageDraft | VideoDraft }
  | { type: "jobAdd"; job: Job }
  | { type: "jobPatch"; id: string; patch: Partial<Job> }
  | { type: "jobRemove"; id: string }
  | { type: "jobComplete"; id: string; items: GenerationItem[] }
  | { type: "toggleFavorite"; id: string }
  | { type: "deleteItem"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "setHistory"; history: GenerationItem[]; favorites?: string[] }
  | { type: "storageError"; message: string | null };

const initialState: State = {
  hydrated: false,
  mode: "image",
  drafts: { image: defaultImageDraft(), video: defaultVideoDraft() },
  history: [],
  favorites: [],
  jobs: [],
  settings: DEFAULT_SETTINGS,
  storageError: null,
  freshBatches: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, hydrated: true };
    case "setMode":
      return { ...state, mode: action.mode };
    case "patchDraft":
      return {
        ...state,
        drafts: { ...state.drafts, [action.mode]: { ...state.drafts[action.mode], ...action.patch } },
      };
    case "replaceDraft":
      return { ...state, drafts: { ...state.drafts, [action.mode]: action.draft } };
    case "jobAdd":
      return { ...state, jobs: [action.job, ...state.jobs] };
    case "jobPatch":
      return { ...state, jobs: state.jobs.map((j) => (j.id === action.id ? { ...j, ...action.patch } : j)) };
    case "jobRemove":
      return { ...state, jobs: state.jobs.filter((j) => j.id !== action.id) };
    case "jobComplete":
      return {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== action.id),
        history: [...action.items, ...state.history],
        freshBatches: [action.id, ...state.freshBatches].slice(0, 20),
      };
    case "toggleFavorite":
      return {
        ...state,
        favorites: state.favorites.includes(action.id)
          ? state.favorites.filter((f) => f !== action.id)
          : [action.id, ...state.favorites],
      };
    case "deleteItem":
      return {
        ...state,
        history: state.history.filter((h) => h.id !== action.id),
        favorites: state.favorites.filter((f) => f !== action.id),
      };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "setHistory":
      return {
        ...state,
        history: action.history,
        favorites: action.favorites ?? state.favorites.filter((f) => action.history.some((h) => h.id === f)),
      };
    case "storageError":
      return { ...state, storageError: action.message };
  }
}

// ----------------------------------------------------------------- hydration

function sanitizeDrafts(raw: unknown, settings: Settings): Drafts {
  const fallback = {
    image: defaultImageDraft(settings.defaultImageModel),
    video: defaultVideoDraft(settings.defaultVideoModel),
  };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Partial<Drafts>;
  const image =
    r.image && getImageModel(r.image.modelId) ? { ...fallback.image, ...r.image } : fallback.image;
  const video =
    r.video && getVideoModel(r.video.modelId) ? { ...fallback.video, ...r.video } : fallback.video;
  return { image, video };
}

function isItem(x: unknown): x is GenerationItem {
  const i = x as GenerationItem;
  return !!i && typeof i.id === "string" && !!i.request && !!i.asset && typeof i.asset.url === "string";
}

function loadPersisted(): { state: Partial<State>; error: string | null } {
  const settingsRes = readJSON<Partial<Settings>>(STORAGE_KEYS.settings);
  if (!settingsRes.ok) {
    return {
      state: {
        history: buildSampleHistory(),
        favorites: SAMPLE_FAVORITE_IDS,
      },
      error: "This browser is blocking local storage, so history and settings won't be kept after you close the tab.",
    };
  }
  const settings = { ...DEFAULT_SETTINGS, ...(settingsRes.value ?? {}) };
  const seeded = readJSON<boolean>(STORAGE_KEYS.seeded);
  const historyRes = readJSON<unknown[]>(STORAGE_KEYS.history);
  const favRes = readJSON<string[]>(STORAGE_KEYS.favorites);
  const draftsRes = readJSON<unknown>(STORAGE_KEYS.drafts);
  const modeRes = readJSON<Mode>(STORAGE_KEYS.mode);

  const firstRun = !(seeded.ok && seeded.value);
  let history: GenerationItem[] =
    historyRes.ok && Array.isArray(historyRes.value) ? historyRes.value.filter(isItem) : [];
  let favorites = favRes.ok && Array.isArray(favRes.value) ? favRes.value.filter((f) => typeof f === "string") : [];
  if (firstRun) {
    history = [...history, ...buildSampleHistory()];
    favorites = [...favorites, ...SAMPLE_FAVORITE_IDS];
    writeJSON(STORAGE_KEYS.seeded, true);
  }
  const mode = modeRes.ok && (modeRes.value === "image" || modeRes.value === "video") ? modeRes.value : "image";
  return {
    state: {
      settings,
      history,
      favorites,
      mode,
      drafts: sanitizeDrafts(draftsRes.ok ? draftsRes.value : null, settings),
    },
    error: null,
  };
}

// ----------------------------------------------------------------- context

export type GenerateResult = { ok: true; jobId: string } | { ok: false; errors: ValidationErrors; reason?: string };

interface StudioApi {
  state: State;
  isFavorite: (id: string) => boolean;
  setMode: (mode: Mode) => void;
  patchImageDraft: (patch: Partial<ImageDraft>) => void;
  patchVideoDraft: (patch: Partial<VideoDraft>) => void;
  replaceDraft: (mode: Mode, draft: ImageDraft | VideoDraft) => void;
  generate: (request: GenerationRequest) => GenerateResult;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => GenerateResult | null;
  dismissJob: (id: string) => void;
  /** Restores the item's prompt/settings into the Create form and starts a new run. */
  generateAgain: (item: GenerationItem) => GenerateResult;
  /** Restores the item's prompt/settings without starting a run. */
  restoreToComposer: (request: GenerationRequest) => void;
  toggleFavorite: (id: string) => void;
  deleteItem: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  clearHistory: () => void;
  removeSamples: () => void;
  restoreSamples: () => void;
}

const StudioContext = createContext<StudioApi | null>(null);

export function describeRequest(request: GenerationRequest): string {
  const model = getModel(request.modelId)?.name ?? request.modelId;
  return request.mode === "image"
    ? `${pluralize(request.outputs, "image")} with ${model}`
    : `a ${request.duration}-second video with ${model}`;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { announce, toast } = useFeedback();
  const stateRef = useRef(state);
  const controllers = useRef(new Map<string, AbortController>());
  const storageWarned = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load persisted data once on mount (client only — avoids hydration mismatches).
  const hydrateOnce = useRef(false);
  useEffect(() => {
    if (hydrateOnce.current) return;
    hydrateOnce.current = true;
    const { state: loaded, error } = loadPersisted();
    dispatch({ type: "hydrate", state: { ...loaded, storageError: error } });
  }, []);

  // Persist slices after hydration. Failures surface once, never crash.
  const persist = useCallback(
    (key: Parameters<typeof writeJSON>[0], value: unknown) => {
      const res = writeJSON(key, value);
      if (!res.ok) {
        const quota = res.error instanceof DOMException && res.error.name === "QuotaExceededError";
        const message = quota
          ? "Browser storage is full. New changes are kept for this session only."
          : "Couldn't save to browser storage. Changes are kept for this session only.";
        dispatch({ type: "storageError", message });
        if (!storageWarned.current) {
          storageWarned.current = true;
          toast({ tone: "error", title: "Storage unavailable", description: message });
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    if (state.hydrated) persist(STORAGE_KEYS.history, state.history);
  }, [state.hydrated, state.history, persist]);
  useEffect(() => {
    if (state.hydrated) persist(STORAGE_KEYS.favorites, state.favorites);
  }, [state.hydrated, state.favorites, persist]);
  useEffect(() => {
    if (state.hydrated) persist(STORAGE_KEYS.settings, state.settings);
  }, [state.hydrated, state.settings, persist]);
  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => persist(STORAGE_KEYS.drafts, state.drafts), 300);
    return () => clearTimeout(t);
  }, [state.hydrated, state.drafts, persist]);
  useEffect(() => {
    if (state.hydrated) persist(STORAGE_KEYS.mode, state.mode);
  }, [state.hydrated, state.mode, persist]);

  // Motion preference → <html data-motion>, consumed by globals.css.
  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.motion;
  }, [state.settings.motion]);

  // Abort anything still running if the provider unmounts.
  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((c) => c.abort());
  }, []);

  const runJob = useCallback(
    async (job: Job) => {
      const controller = new AbortController();
      controllers.current.set(job.id, controller);
      const provider = getProviderForModel(job.request.modelId);
      const settings = stateRef.current.settings;
      const forceFailure = settings.mockFailureMode !== "off";
      if (settings.mockFailureMode === "next") dispatch({ type: "settings", patch: { mockFailureMode: "off" } });

      let lastStatus: Job["status"] = "queued";
      const description = describeRequest(job.request);
      try {
        const result = await provider.generate(job.request, {
          signal: controller.signal,
          mock: { forceFailure, speed: settings.mockSpeed },
          onUpdate: (update) => {
            if (controller.signal.aborted) return;
            if (update.status === "queued") {
              dispatch({
                type: "jobPatch",
                id: job.id,
                patch: { status: "queued", queuePosition: update.position, statusMessage: update.message },
              });
              return;
            }
            dispatch({
              type: "jobPatch",
              id: job.id,
              patch: {
                status: "running",
                progress: update.progress,
                simulated: update.simulated,
                statusMessage: update.message,
              },
            });
            // Announce status transitions only — never individual progress ticks.
            if (lastStatus !== "running") {
              lastStatus = "running";
              announce(`Generating ${description}.`);
            }
          },
        });
        if (controller.signal.aborted) return;
        const createdAt = new Date().toISOString();
        const cost = estimateCost(job.request)?.perOutput ?? 0;
        const items: GenerationItem[] = result.outputs.map((asset, index) => ({
          id: `${job.id}_${index}`,
          batchId: job.id,
          index,
          request: job.request,
          asset,
          cost,
          createdAt,
          providerId: provider.id,
        }));
        dispatch({ type: "jobComplete", id: job.id, items });
        const what =
          job.request.mode === "image" ? `${pluralize(items.length, "image")} ready` : "Video ready";
        announce(`Generation complete. ${what}.`);
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          toast({ tone: "success", title: what, description: description, action: { label: "Open in Create", href: "/" }, silent: true });
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          dispatch({ type: "jobPatch", id: job.id, patch: { status: "canceled", progress: undefined } });
          announce("Generation canceled.");
          return;
        }
        const err =
          error instanceof GenerationError
            ? { code: error.code, message: error.message, retryable: error.retryable }
            : { code: "unknown", message: "Something went wrong while generating. Please try again.", retryable: true };
        dispatch({ type: "jobPatch", id: job.id, patch: { status: "failed", error: err } });
        announce(`Generation failed. ${err.message}`, "assertive");
      } finally {
        controllers.current.delete(job.id);
      }
    },
    [announce, toast],
  );

  const generate = useCallback(
    (request: GenerationRequest): GenerateResult => {
      const errors = validateRequest(request);
      if (Object.keys(errors).length) return { ok: false, errors };
      const active = stateRef.current.jobs.filter((j) => j.status === "queued" || j.status === "running").length;
      if (active >= MAX_ACTIVE_JOBS) {
        const reason = `${MAX_ACTIVE_JOBS} generations are already running. Wait for one to finish or cancel one.`;
        announce(reason, "assertive");
        return { ok: false, errors: {}, reason };
      }
      const job: Job = {
        id: createId("gen"),
        request: { ...request, prompt: request.prompt.trim() },
        status: "queued",
        simulated: true,
        createdAt: new Date().toISOString(),
        estimatedCost: estimateCost(request)?.total ?? 0,
      };
      dispatch({ type: "jobAdd", job });
      announce(`Queued ${describeRequest(request)}.`);
      void runJob(job);
      return { ok: true, jobId: job.id };
    },
    [announce, runJob],
  );

  const cancelJob = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const dismissJob = useCallback((id: string) => dispatch({ type: "jobRemove", id }), []);

  const retryJob = useCallback(
    (id: string) => {
      const job = stateRef.current.jobs.find((j) => j.id === id);
      if (!job) return null;
      const result = generate(job.request);
      if (result.ok) dispatch({ type: "jobRemove", id });
      return result;
    },
    [generate],
  );

  const restoreToComposer = useCallback((request: GenerationRequest) => {
    dispatch({ type: "replaceDraft", mode: request.mode, draft: draftFromRequest(request) });
    dispatch({ type: "setMode", mode: request.mode });
  }, []);

  const generateAgain = useCallback(
    (item: GenerationItem) => {
      restoreToComposer(item.request);
      return generate(item.request);
    },
    [generate, restoreToComposer],
  );

  const toggleFavorite = useCallback((id: string) => {
    const wasFavorite = stateRef.current.favorites.includes(id);
    dispatch({ type: "toggleFavorite", id });
    announce(wasFavorite ? "Removed from favorites." : "Added to favorites.");
  }, [announce]);

  const api = useMemo<StudioApi>(
    () => ({
      state,
      isFavorite: (id) => state.favorites.includes(id),
      setMode: (mode) => dispatch({ type: "setMode", mode }),
      patchImageDraft: (patch) => dispatch({ type: "patchDraft", mode: "image", patch }),
      patchVideoDraft: (patch) => dispatch({ type: "patchDraft", mode: "video", patch }),
      replaceDraft: (mode, draft) => dispatch({ type: "replaceDraft", mode, draft }),
      generate,
      cancelJob,
      retryJob,
      dismissJob,
      generateAgain,
      restoreToComposer,
      toggleFavorite,
      deleteItem: (id) => dispatch({ type: "deleteItem", id }),
      updateSettings: (patch) => dispatch({ type: "settings", patch }),
      resetSettings: () => dispatch({ type: "settings", patch: DEFAULT_SETTINGS }),
      clearHistory: () => {
        dispatch({ type: "setHistory", history: [], favorites: [] });
        const keep = stateRef.current.drafts.video.reference?.id;
        void pruneReferences(new Set(keep ? [keep] : []));
      },
      removeSamples: () =>
        dispatch({ type: "setHistory", history: stateRef.current.history.filter((h) => !h.sample) }),
      restoreSamples: () => {
        const own = stateRef.current.history.filter((h) => !h.sample);
        const samples = buildSampleHistory();
        const history = [...own, ...samples].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const favorites = Array.from(new Set([...stateRef.current.favorites, ...SAMPLE_FAVORITE_IDS]));
        dispatch({ type: "setHistory", history, favorites });
      },
    }),
    [state, generate, cancelJob, retryJob, dismissJob, generateAgain, restoreToComposer, toggleFavorite],
  );

  return <StudioContext.Provider value={api}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioApi {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}
