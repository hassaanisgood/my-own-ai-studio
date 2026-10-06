import { FlaskConical } from "lucide-react";

export function MockNotice() {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
        <FlaskConical size={13} className="text-warn" aria-hidden /> Mock mode
      </p>
      <p className="mt-1 text-[11.5px] leading-snug text-fg-subtle">
        No AI services are called. Models, results and costs are illustrative.
      </p>
    </div>
  );
}
