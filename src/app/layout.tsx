import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "./globals.css";
import { companies, topics, generatedAt } from "@/lib/data";
import { MainNav, SuperTabs, type Tab } from "@/components/Nav";
import { BrandMark } from "@/components/Logo";
import { TimeAgo } from "@/components/TimeAgo";

export const metadata: Metadata = {
  metadataBase: new URL("https://sirumors.com"),
  title: { default: "SI Rumors: AI and Superintelligence News, Leaks and Releases", template: "%s · SI Rumors" },
  description:
    "The all-in-one tracker for the road to superintelligence: AI news, leaks and rumors rated by confidence, release history with next-release estimates, Codex resets, robotics and robotaxis.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }], apple: "/apple-touch-icon.png" },
  openGraph: { siteName: "SI Rumors", type: "website", url: "https://sirumors.com/" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

const TOPIC_ICONS: Record<string, string> = { models: "🧠", codex: "⌨️", robotics: "🤖", autonomy: "🚕", chips: "🔲", agi: "✦", policy: "⚖️", money: "💰" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tabs: Tab[] = [
    { href: "/", label: "All", mono: "◉" },
    ...companies.slice(0, 9).map((c) => ({ href: `/c/${c.slug}/`, label: c.name.replace(/ AI$/, ""), logo: c.slug })),
    ...topics.map((t) => ({ href: `/t/${t.slug}/`, label: t.name, mono: TOPIC_ICONS[t.slug] })),
    ...companies.slice(9).map((c) => ({ href: `/c/${c.slug}/`, label: c.name.replace(/ AI$/, ""), logo: c.slug })),
  ];
  const logos = Object.fromEntries(companies.map((c) => [c.slug, existsSync(join(process.cwd(), "public/logos", `${c.slug}.png`))]));
  const built = Date.parse(generatedAt);
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-line backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-3 sm:flex-nowrap sm:px-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label="SI Rumors home">
              <BrandMark size={30} />
              <span className="text-xl font-extrabold tracking-tight">
                <span className="grad-text">SI</span>Rumors
              </span>
            </Link>
            <div className="hidden items-center gap-1.5 text-xs text-muted sm:order-last sm:ml-auto sm:flex">
              <span className="live-dot" /> Updated <TimeAgo iso={generatedAt} built={built} />
            </div>
            <div className="w-full sm:w-auto"><MainNav /></div>
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-5">
            <SuperTabs tabs={tabs} logos={logos} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-5">{children}</main>
        <footer className="border-t border-line py-8 text-sm text-muted">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2 font-bold text-text"><BrandMark size={20} /> SI Rumors</div>
              <p className="mt-1 max-w-md">The all-in-one tracker for the road to superintelligence. SI stands for superintelligence. Headlines link to the original publishers.</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/about/" className="link-hover">About & sources</Link>
              <Link href="/releases/" className="link-hover">Release tracker</Link>
              <Link href="/rumors/" className="link-hover">Rumor board</Link>
              <Link href="/codex/" className="link-hover">Codex tracker</Link>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl px-4 text-xs text-faint sm:px-5">© {new Date(generatedAt).getUTCFullYear()} SI Rumors. Not affiliated with any AI lab or publication. Rumors are rated, not confirmed; estimates are estimates.</p>
        </footer>
      </body>
    </html>
  );
}
