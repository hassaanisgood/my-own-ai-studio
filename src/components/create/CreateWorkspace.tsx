"use client";

import { useStudio } from "@/state/studio-store";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { Composer } from "./Composer";
import { ModeTabs } from "./ModeTabs";

export function CreateWorkspace() {
  const { state, setMode } = useStudio();
  const { mode } = state;

  return (
    <div className="flex flex-1 flex-col lg:h-dvh lg:flex-none lg:flex-row lg:overflow-hidden">
      <div className="min-w-0 lg:flex-1 lg:scroll-pb-36 lg:overflow-y-auto" id="composer-scroll">
        <div className="mx-auto w-full max-w-[720px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">Create</h1>
              <p className="mt-1 text-[13.5px] text-fg-muted">
                {mode === "image" ? "Generate stills from a prompt." : "Generate motion from a prompt or a reference still."}
              </p>
            </div>
            <ModeTabs mode={mode} onChange={setMode} panelId="composer-panel" />
          </header>
          <div role="tabpanel" id="composer-panel" aria-labelledby={`tab-${mode}`} tabIndex={-1} className="outline-none">
            {state.hydrated ? (
              <Composer key={mode} />
            ) : (
              <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
                <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
                <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
                <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-surface-1/40 px-4 py-6 sm:px-6 lg:w-[44%] lg:max-w-[760px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6 lg:py-8 xl:px-8">
        <ResultsPanel />
      </div>
    </div>
  );
}
