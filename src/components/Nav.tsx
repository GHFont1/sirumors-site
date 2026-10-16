"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type Tab = { href: string; label: string; logo?: string; mono?: string };

const NAV = [
  { href: "/", label: "Live updates" },
  { href: "/rankings/", label: "Rankings" },
  { href: "/resets/", label: "Resets" },
  { href: "/codex/", label: "Codex" },
  { href: "/claude/", label: "Claude" },
  { href: "/releases/", label: "Releases" },
  { href: "/rumors/", label: "Rumors" },
  { href: "/odds/", label: "Odds" },
];
const MORE = [
  { href: "/news/", label: "All news" },
  { href: "/models/", label: "Best AI models" },
  { href: "/videos/", label: "Videos" },
  { href: "/trends/", label: "Trends" },
  { href: "/people/", label: "People to follow" },
  { href: "/forums/", label: "Forums" },
  { href: "/leaderboard/", label: "Leaderboard" },
];

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");
const linkStyle = (active: boolean) => ({ color: active ? "var(--text)" : "var(--muted)", background: active ? "var(--chip)" : "transparent" });

/** A nav dropdown. The panel is fixed-positioned so the scrolling nav row never clips it. */
function Menu({ label, active, children }: { label: string; active: boolean; children: (close: () => void) => React.ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setPos(null), [path]);
  useEffect(() => {
    if (!pos) return;
    const off = (e: Event) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setPos(null); };
    document.addEventListener("pointerdown", off);
    window.addEventListener("scroll", off, true);
    return () => { document.removeEventListener("pointerdown", off); window.removeEventListener("scroll", off, true); };
  }, [pos]);
  return (
    <>
      <button ref={btn} type="button" aria-expanded={!!pos}
        onClick={() => { const r = btn.current!.getBoundingClientRect(); setPos(pos ? null : { top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 248)) }); }}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors" style={linkStyle(active || !!pos)}>
        {label} <span aria-hidden className="text-[10px]">▾</span>
      </button>
      {pos && (
        <div ref={panel} className="card fixed z-50 max-h-[70vh] w-60 overflow-y-auto p-1.5 shadow-xl" style={{ top: pos.top, left: pos.left }}>
          {children(() => setPos(null))}
        </div>
      )}
    </>
  );
}

export function MainNav({ companies, logos }: { companies: Tab[]; logos: Record<string, boolean> }) {
  const path = norm(usePathname() || "/");
  const item = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-chip";
  return (
    <nav aria-label="Sections" className="no-scrollbar -mx-1 flex items-center gap-0.5 overflow-x-auto">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors" style={linkStyle(active)}>{n.label}</Link>;
      })}
      <Menu label="Companies" active={path.startsWith("/c/") || path.startsWith("/t/")}>
        {(close) => companies.map((t) => (
          <Link key={t.href} href={t.href} onClick={close} className={item}>
            {t.logo && logos[t.logo] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/logos/${t.logo}.png`} alt="" width={18} height={18} className="rounded-[4px] bg-white" />
            ) : <span aria-hidden className="w-[18px] text-center">{t.mono ?? "•"}</span>}
            {t.label}
          </Link>
        ))}
      </Menu>
      <Menu label="More" active={MORE.some((m) => path.startsWith(m.href))}>
        {(close) => MORE.map((m) => <Link key={m.href} href={m.href} onClick={close} className={item}>{m.label}</Link>)}
      </Menu>
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
