/** Shared button class recipes. */
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-accent-ink transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-3 px-3.5 font-medium text-fg transition-colors hover:bg-surface-4 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 font-medium text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3.5 font-medium text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50",
};
