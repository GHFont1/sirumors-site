import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "./globals.css";
import { GOOGLE_SITE_VERIFICATION } from "@/lib/seo";
import { companies, topics, generatedAt } from "@/lib/data";
import { MainNav, type Tab } from "@/components/Nav";
import { BrandMark } from "@/components/Logo";
import { TimeAgo } from "@/components/TimeAgo";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PointsToast, SignInModal, UsernamePrompt, UserMenu } from "@/components/auth/UserUI";

export const metadata: Metadata = {
  metadataBase: new URL("https://sirumors.com"),
  title: { default: "SI Rumors: AI and Superintelligence News, Leaks and Releases", template: "%s · SI Rumors" },
  description:
    "The all-in-one tracker for the road to superintelligence: AI news, leaks and rumors rated by confidence, release history with next-release estimates, usage resets at every lab, robotics and robotaxis.",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { siteName: "SI Rumors", type: "website", url: "https://sirumors.com/", images: [{ url: "/og.png", width: 1200, height: 630, alt: "SI Rumors: superintelligence news, before it's news" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/feed.xml", title: "SI Rumors" }] } },
  // Search engine ownership checks. Google's token is added once Search Console verification is set up.
  verification: { ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}), other: { "msvalidate.01": "6B3AA32291700B0BB5E8DE2CD348FE7C" } },
};

/** Who publishes the site, for search engines. */
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://sirumors.com/#org", name: "SI Rumors", url: "https://sirumors.com/", logo: { "@type": "ImageObject", url: "https://sirumors.com/icon-512.png", width: 512, height: 512 } },
    { "@type": "WebSite", "@id": "https://sirumors.com/#site", name: "SI Rumors", url: "https://sirumors.com/", publisher: { "@id": "https://sirumors.com/#org" }, inLanguage: "en-US" },
  ],
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
    ...companies.map((c) => ({ href: `/c/${c.slug}/`, label: c.name.replace(/ AI$/, ""), logo: c.slug })),
    ...topics.map((t) => ({ href: `/t/${t.slug}/`, label: t.name, mono: TOPIC_ICONS[t.slug] })),
  ];
  const logos = Object.fromEntries(companies.map((c) => [c.slug, existsSync(join(process.cwd(), "public/logos", `${c.slug}.png`))]));
  const built = Date.parse(generatedAt);
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
        <AuthProvider>
        <header className="sticky top-0 z-30 border-b border-line backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 sm:flex-nowrap sm:px-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label="SI Rumors home">
              <BrandMark size={30} />
              <span className="text-xl font-extrabold tracking-tight">
                <span className="grad-text">SI</span>Rumors
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-4 sm:order-last">
              <span className="hidden items-center gap-1.5 text-xs text-muted lg:flex"><span className="live-dot" /> Updated <TimeAgo iso={generatedAt} built={built} /></span>
              <UserMenu />
            </div>
            <div className="w-full min-w-0 sm:w-auto"><MainNav companies={tabs} logos={logos} /></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-5">{children}</main>
        <footer className="border-t border-line py-8 text-sm text-muted">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2 font-bold text-text"><BrandMark size={20} /> SI Rumors</div>
              <p className="mt-1 max-w-md">The all-in-one tracker for the road to superintelligence. SI stands for superintelligence. Every story has its own page here, in our words.</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/about/" className="link-hover">About & sources</Link>
              <Link href="/releases/" className="link-hover">Release tracker</Link>
              <Link href="/rumors/" className="link-hover">Rumor board</Link>
              <Link href="/resets/" className="link-hover">Resets</Link>
              <Link href="/codex/" className="link-hover">Codex tracker</Link>
              <Link href="/forums/" className="link-hover">Forums</Link>
              <Link href="/leaderboard/" className="link-hover">Leaderboard</Link>
              <Link href="/me/" className="link-hover">My feed</Link>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl px-4 text-xs text-faint sm:px-5">© {new Date(generatedAt).getUTCFullYear()} SI Rumors. Not affiliated with any AI lab or publication. Rumors are rated, not confirmed; estimates are estimates.</p>
        </footer>
        <SignInModal />
        <UsernamePrompt />
        <PointsToast />
        </AuthProvider>
      </body>
    </html>
  );
}
