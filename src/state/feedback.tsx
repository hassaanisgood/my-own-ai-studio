"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, CircleAlert, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
  action?: { label: string; href: string };
  /** When true the toast is visual-only because the message was already announced. */
  silent?: boolean;
}

interface FeedbackApi {
  /** Announce a status change to assistive technology (polite, not visual). */
  announce: (message: string, urgency?: "polite" | "assertive") => void;
  toast: (toast: Omit<Toast, "id">) => void;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const announce = useCallback((message: string, urgency: "polite" | "assertive" = "polite") => {
    const set = urgency === "assertive" ? setAssertive : setPolite;
    // Clear first so repeating the same message is still announced.
    set("");
    requestAnimationFrame(() => set(message));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), t.tone === "error" ? 7000 : 3800),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ announce, toast }), [announce, toast]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="announcer-assertive">
        {assertive}
      </div>
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.silent ? undefined : "status"}
            aria-live={t.silent ? "off" : "polite"}
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border border-line-strong bg-surface-3/95 px-3.5 py-3 shadow-2xl shadow-black/50 backdrop-blur-md sm:w-auto sm:min-w-72"
          >
            <span
              className={
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full " +
                (t.tone === "success"
                  ? "bg-ok/15 text-ok"
                  : t.tone === "error"
                    ? "bg-danger/15 text-danger"
                    : "bg-white/10 text-fg-muted")
              }
              aria-hidden
            >
              {t.tone === "success" ? <Check size={12} strokeWidth={3} /> : t.tone === "error" ? <CircleAlert size={12} strokeWidth={2.5} /> : <Info size={12} strokeWidth={2.5} />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{t.description}</p>}
              {t.action && (
                <Link
                  href={t.action.href}
                  onClick={() => dismiss(t.id)}
                  className="mt-1.5 inline-block text-[13px] font-medium text-accent hover:text-accent-strong"
                >
                  {t.action.label}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-m-1 rounded-md p-1 text-fg-subtle hover:bg-white/5 hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}
