"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type Tab = { href: string; label: string; logo?: string; mono?: string };

const NAV = [
  { href: "/news/", label: "News" },
  { href: "/rumors/", label: "Rumors" },
  { href: "/releases/", label: "Releases" },
  { href: "/codex/", label: "Codex" },
  { href: "/videos/", label: "Videos" },
  { href: "/trends/", label: "Trends" },
  { href: "/people/", label: "People" },
];

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

export function MainNav() {
  const path = norm(usePathname() || "/");
  return (
    <nav aria-label="Sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
      {NAV.map((n) => {
        const active = path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors"
            style={{ color: active ? "var(--text)" : "var(--muted)", background: active ? "var(--chip)" : "transparent" }}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The super-tab strip: every company and topic, one tap away. */
export function SuperTabs({ tabs, logos }: { tabs: Tab[]; logos: Record<string, boolean> }) {
  const path = norm(usePathname() || "/");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[data-active=true]");
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return (
    <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto py-2.5">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors"
            style={{
              borderColor: active ? "var(--accent)" : "var(--line)",
              background: active ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface)",
              color: active ? "var(--text)" : "var(--muted)",
            }}
          >
            {t.logo && logos[t.logo] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/logos/${t.logo}.png`} alt="" width={16} height={16} className="rounded-[4px] bg-white" />
            ) : t.mono ? (
              <span aria-hidden className="text-[13px] leading-none">{t.mono}</span>
            ) : null}
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
