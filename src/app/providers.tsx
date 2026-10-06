"use client";

import type { ReactNode } from "react";
import { FeedbackProvider } from "@/state/feedback";
import { StudioProvider } from "@/state/studio-store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <StudioProvider>{children}</StudioProvider>
    </FeedbackProvider>
  );
}
