"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { GenerationItem, Mode } from "@/lib/types";
import { useStudio } from "@/state/studio-store";
import { EmptyState } from "./EmptyState";
import { ResultCard } from "./ResultCard";
import { ResultDialog } from "./ResultDialog";
import { useNow } from "./useNow";

type Filter = "all" | Mode;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

interface Props {
  title: string;
  description: string;
  source: "history" | "favorites";
  empty: { title: string; body: string; action?: { href: string; label: string } };
}

export function Gallery({ title, description, source, empty }: Props) {
  const { state } = useStudio();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [open, setOpen] = useState<GenerationItem | null>(null);
  const now = useNow();

  const base = useMemo(() => {
    if (source === "history") return state.history;
    const favs = new Set(state.favorites);
    return state.history.filter((h) => favs.has(h.id));
  }, [source, state.history, state.favorites]);

  const counts = useMemo(
    () => ({
      all: base.length,
      image: base.filter((i) => i.asset.kind === "image").length,
      video: base.filter((i) => i.asset.kind === "video").length,
    }),
    [base],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = base.filter(
      (i) => (filter === "all" || i.asset.kind === filter) && (!q || i.request.prompt.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) =>
      sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
  }, [base, filter, query, sort]);

  const fresh = new Set(state.freshBatches);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">{title}</h1>
        <p className="text-[13.5px] text-fg-muted">{description}</p>
      </header>

      <div className="sticky top-14 z-10 -mx-4 mt-6 flex flex-col gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:flex-row sm:items-center sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div role="group" aria-label="Filter by type" className="inline-flex self-start rounded-xl border border-line bg-surface-1 p-1">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.value)}
                className={
                  "flex h-8 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors " +
                  (active ? "bg-surface-4 text-fg" : "text-fg-muted hover:text-fg")
                }
              >
                {f.label}
                <span className={"font-mono text-[11px] tabular-nums " + (active ? "text-fg-muted" : "text-fg-subtle")}>
                  {state.hydrated ? counts[f.value] : "–"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-1 items-center gap-2 sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <label htmlFor={`${source}-search`} className="sr-only">
              Search prompts
            </label>
            <input
              id={`${source}-search`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts"
              className="h-10 w-full rounded-lg border border-line bg-surface-1 pl-9 pr-8 text-[13.5px] text-fg outline-none transition-colors focus:border-line-strong [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fg-subtle hover:text-fg"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
          <label htmlFor={`${source}-sort`} className="sr-only">
            Sort
          </label>
          <select
            id={`${source}-sort`}
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="h-10 rounded-lg border border-line bg-surface-1 px-3 text-[13px] text-fg-muted outline-none focus:border-line-strong"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {state.hydrated ? `${items.length} ${items.length === 1 ? "result" : "results"} shown` : ""}
      </p>

      <div className="mt-6">
        {!state.hydrated ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : base.length === 0 ? (
          <EmptyState title={empty.title} action={empty.action}>
            <p>{empty.body}</p>
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="No matches">
            <p>
              Nothing {filter === "all" ? "" : `in ${filter === "image" ? "images" : "videos"} `}
              {query ? `matches “${query}”` : "here yet"}.
            </p>
          </EmptyState>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4" data-testid="gallery">
            {items.map((item) => (
              <ResultCard key={item.id} item={item} onOpen={setOpen} fresh={fresh.has(item.batchId)} now={now} />
            ))}
          </div>
        )}
      </div>
      <ResultDialog item={open} items={items} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </div>
  );
}
