const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fullFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Just now", "12 min ago", "Today 14:12", "Oct 3, 09:40" */
export function formatTimestamp(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const diff = now - date.getTime();
  if (diff < 45_000) return "Just now";
  if (diff < 60 * 60_000) return `${Math.max(1, Math.round(diff / 60_000))} min ago`;
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return `Today, ${timeFmt.format(date)}`;
  const yesterday = new Date(now - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeFmt.format(date)}`;
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}

export function formatFullTimestamp(iso: string): string {
  return fullFmt.format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
