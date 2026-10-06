"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GenerationItem } from "@/lib/types";
import { useStudio } from "@/state/studio-store";
import { EmptyState } from "./EmptyState";
import { JobCard } from "./JobCard";
import { ResultCard } from "./ResultCard";
import { ResultDialog } from "./ResultDialog";
import { useNow } from "./useNow";

const LIMIT = 24;

export function ResultsPanel() {
  const { state } = useStudio();
  const [open, setOpen] = useState<GenerationItem | null>(null);
  const now = useNow();

  // The workspace shows what you made here; sample generations live on the Generations page.
  const own = useMemo(() => state.history.filter((h) => !h.sample), [state.history]);
  const shown = own.slice(0, LIMIT);
  const fresh = new Set(state.freshBatches);
  const activeJobs = state.jobs;

  return (
    <section aria-labelledby="results-heading" className="flex min-h-full flex-col">
      <div id="results-top" className="scroll-mt-20" />
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="results-heading" className="text-[15px] font-semibold text-fg">
            Results
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-subtle">
            {state.hydrated && own.length ? `${own.length} from this workspace` : "New generations appear here"}
          </p>
        </div>
        <Link
          href="/generations"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] font-medium text-fg-muted hover:text-fg"
        >
          All generations <ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      {activeJobs.length > 0 && (
        <div aria-label="Generation queue" role="region">
          {activeJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!state.hydrated ? (
        <div className="grid grid-cols-2 gap-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : shown.length === 0 && activeJobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line">
          <EmptyState title="Your canvas is clear" action={{ href: "/generations", label: "Browse sample generations" }}>
            <p>
              Write a prompt, choose a model and press <span className="font-medium text-fg">Generate</span>. Results
              land here with their model, prompt, mock cost and time.
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-1 xl:columns-2">
            {shown.map((item) => (
              <ResultCard key={item.id} item={item} onOpen={setOpen} fresh={fresh.has(item.batchId)} now={now} />
            ))}
          </div>
          {own.length > LIMIT && (
            <Link href="/generations" className="mt-2 self-center text-[13px] font-medium text-accent hover:text-accent-strong">
              View all {own.length} generations
            </Link>
          )}
        </>
      )}
      <ResultDialog item={open} items={shown} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </section>
  );
}
