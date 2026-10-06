"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { IMAGE_MODELS, VIDEO_MODELS, getImageModel, getVideoModel } from "@/config/models";
import { studio as studioConfig } from "@/config/studio";
import { switchImageModel, switchVideoModel } from "@/lib/drafts";
import { formatBytes } from "@/lib/format";
import { MOCK_FAILURE_TOKENS } from "@/lib/providers/mock";
import { usedBytes } from "@/lib/storage/local";
import type { FailureMode, MockSpeed, MotionPreference } from "@/lib/types";
import { useFeedback } from "@/state/feedback";
import { useStudio } from "@/state/studio-store";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { Switch } from "@/components/ui/Switch";
import { btn } from "@/components/ui/buttons";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="grid gap-6 border-t border-line py-8 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 id={id} className="text-[14.5px] font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[13px] leading-snug text-fg-subtle">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

function SelectField({
  id,
  label,
  description,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-medium text-fg">
        {label}
      </label>
      {description && (
        <p id={`${id}-desc`} className="mt-1 text-[13px] text-fg-subtle">
          {description}
        </p>
      )}
      <select
        id={id}
        value={value}
        aria-describedby={description ? `${id}-desc` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2.5 block h-10 w-full max-w-sm rounded-lg border border-line-strong bg-surface-2 px-3 text-[14px] text-fg outline-none focus:border-fg-subtle"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsView() {
  const s = useStudio();
  const { announce, toast } = useFeedback();
  const { settings, history, favorites, storageError, hydrated } = s.state;
  const [confirmClear, setConfirmClear] = useState(false);
  const [bytes, setBytes] = useState(0);
  const samples = history.filter((h) => h.sample).length;

  useEffect(() => {
    if (!hydrated) return;
    // Storage writes are effects too, so measure on the next frame.
    const t = setTimeout(() => setBytes(usedBytes()), 50);
    return () => clearTimeout(t);
  }, [hydrated, history, favorites, settings]);

  const saved = (msg = "Setting saved.") => announce(msg);

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">Settings</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Preferences are saved in this browser automatically.</p>
      </header>

      {storageError && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-[13.5px] text-fg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          {storageError}
        </div>
      )}

      <div className="mt-8">
        <Section title="Defaults" description="Models selected in Create. Changing one also updates the current draft.">
          <SelectField
            id="default-image-model"
            label="Default image model"
            value={settings.defaultImageModel}
            options={IMAGE_MODELS.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(id) => {
              const model = getImageModel(id);
              if (!model) return;
              s.updateSettings({ defaultImageModel: id });
              s.replaceDraft("image", switchImageModel(s.state.drafts.image, model).draft);
              saved(`Default image model set to ${model.name}.`);
            }}
          />
          <SelectField
            id="default-video-model"
            label="Default video model"
            value={settings.defaultVideoModel}
            options={VIDEO_MODELS.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(id) => {
              const model = getVideoModel(id);
              if (!model) return;
              s.updateSettings({ defaultVideoModel: id });
              s.replaceDraft("video", switchVideoModel(s.state.drafts.video, model).draft);
              saved(`Default video model set to ${model.name}.`);
            }}
          />
        </Section>

        <Section title="Display">
          <Switch
            id="show-costs"
            label="Show cost estimates"
            description="Mock per-run estimates next to models, settings and results. Prices are illustrative, not real."
            checked={settings.showCostEstimates}
            onChange={(v) => {
              s.updateSettings({ showCostEstimates: v });
              saved(v ? "Cost estimates shown." : "Cost estimates hidden.");
            }}
          />
          <Switch
            id="loop-videos"
            label="Loop video playback"
            description="Replay videos automatically when they reach the end."
            checked={settings.loopVideoPreviews}
            onChange={(v) => {
              s.updateSettings({ loopVideoPreviews: v });
              saved();
            }}
          />
        </Section>

        <Section title="Accessibility" description="Reduced motion turns off shimmer, pulse and slide animations.">
          <OptionGroup<MotionPreference>
            legend="Motion"
            name="motion"
            value={settings.motion}
            onChange={(motion) => {
              s.updateSettings({ motion });
              saved();
            }}
            options={[
              { value: "system", label: "Match system" },
              { value: "reduce", label: "Reduce" },
              { value: "full", label: "Full" },
            ]}
          />
        </Section>

        <Section
          title="Mock provider"
          description="Every generation is simulated locally. Use these controls to test queued, failed and slow states."
        >
          <OptionGroup<FailureMode>
            legend="Simulated failures"
            name="failure-mode"
            value={settings.mockFailureMode}
            onChange={(mockFailureMode) => {
              s.updateSettings({ mockFailureMode });
              saved();
            }}
            columns={3}
            options={[
              { value: "off", label: "Off" },
              { value: "next", label: "Fail next run", hint: "Then resets to Off" },
              { value: "always", label: "Fail every run" },
            ]}
          />
          <OptionGroup<MockSpeed>
            legend="Simulation speed"
            name="mock-speed"
            value={settings.mockSpeed}
            onChange={(mockSpeed) => {
              s.updateSettings({ mockSpeed });
              saved();
            }}
            options={[
              { value: "realistic", label: "Realistic", hint: "4–9 seconds" },
              { value: "fast", label: "Fast", hint: "1–3 seconds" },
            ]}
          />
          <div>
            <p className="text-[14px] font-medium text-fg">Prompt failure tokens</p>
            <p className="mt-1 text-[13px] text-fg-subtle">
              Include one of these anywhere in a prompt to fail that run deterministically, every time.
            </p>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {Object.entries(MOCK_FAILURE_TOKENS).map(([token, f]) => (
                <li key={token} className="flex flex-col gap-1 bg-surface-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                  <code className="w-32 shrink-0 font-mono text-[12.5px] text-accent">{token}</code>
                  <span className="text-[13px] text-fg-muted">
                    {f.message.replace(" (simulated)", "")}
                    <span className="text-fg-subtle"> · {f.retryable ? "retryable" : "requires a prompt edit"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Data & storage" description="History, favorites and settings live in local storage; uploaded reference images in IndexedDB.">
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Generations", hydrated ? history.length : "–"],
              ["Favorites", hydrated ? favorites.length : "–"],
              ["Local storage", hydrated ? formatBytes(bytes) : "–"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-surface-1 px-4 py-3">
                <dt className="text-[12px] text-fg-subtle">{k}</dt>
                <dd className="mt-1 font-mono text-[16px] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {samples > 0 ? (
              <button
                type="button"
                className={btn.secondary + " h-9 text-[13px]"}
                onClick={() => {
                  s.removeSamples();
                  toast({ tone: "success", title: "Sample generations removed" });
                }}
              >
                Remove {samples} sample generations
              </button>
            ) : (
              <button
                type="button"
                className={btn.secondary + " h-9 text-[13px]"}
                onClick={() => {
                  s.restoreSamples();
                  toast({ tone: "success", title: "Sample generations restored" });
                }}
              >
                Restore sample generations
              </button>
            )}
            <button
              type="button"
              className={btn.secondary + " h-9 text-[13px]"}
              onClick={() => {
                s.resetSettings();
                toast({ tone: "success", title: "Settings reset to defaults" });
              }}
            >
              Reset settings
            </button>
          </div>
          <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-4">
            <p className="text-[14px] font-medium text-fg">Clear history</p>
            <p className="mt-1 text-[13px] text-fg-muted">
              Permanently removes every generation, favorite and stored reference image from this browser.
            </p>
            {confirmClear ? (
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Confirm clear history">
                <span className="text-[13px] text-fg">This can&apos;t be undone.</span>
                <button
                  type="button"
                  autoFocus
                  className={btn.danger + " h-9 text-[13px]"}
                  onClick={() => {
                    s.clearHistory();
                    setConfirmClear(false);
                    toast({ tone: "success", title: "History cleared" });
                  }}
                >
                  Yes, clear everything
                </button>
                <button type="button" className={btn.ghost + " h-9 text-[13px]"} onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={btn.danger + " mt-3 h-9 text-[13px]"}
                disabled={!history.length}
                onClick={() => setConfirmClear(true)}
              >
                Clear history…
              </button>
            )}
          </div>
        </Section>

        <Section title="About">
          <p className="text-[13.5px] leading-relaxed text-fg-muted">
            {studioConfig.name} {studioConfig.descriptor} is running with the mock provider: no external AI APIs are
            called and no credentials are stored. Branding lives in{" "}
            <code className="font-mono text-[12.5px] text-fg">src/config/studio.ts</code>; models and mock pricing in{" "}
            <code className="font-mono text-[12.5px] text-fg">src/config/models.ts</code>.
          </p>
        </Section>
      </div>
    </div>
  );
}
