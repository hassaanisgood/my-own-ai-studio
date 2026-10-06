import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { studio } from "@/config/studio";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${studio.name} ${studio.descriptor}`, template: `%s · ${studio.name}` },
  description: studio.tagline,
};

export const viewport: Viewport = {
  themeColor: "#09090a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} data-motion="system">
      <body className="min-h-dvh overflow-x-hidden">
        <Providers>
          <a
            href="#main"
            className="sr-only z-[100] rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
          >
            Skip to main content
          </a>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
