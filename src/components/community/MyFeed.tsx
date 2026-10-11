"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth, type FollowKind } from "@/components/auth/AuthProvider";
import { FollowButton } from "@/components/auth/UserUI";

type Lite = {
  stories: { id: string; t: string; u: string; s: string; d: string; ty: string; r?: string; cf?: number; c: string[]; tp: string[]; p: string[]; n?: number }[];
  lines: { id: string; name: string; company: string; last?: { name: string; date: string }; next: string | null }[];
  names: Record<string, string>;
};
type Pick = { kind: FollowKind; slug: string; name: string; logo?: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const md = (iso: string) => { const d = new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const ago = (iso: string) => { const s = (Date.now() - Date.parse(iso)) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`; };

export function MyFeed({ picks }: { picks: Pick[] }) {
  const { ready, session, follows, openSignIn } = useAuth();
  const [lite, setLite] = useState<Lite | null>(null);
  useEffect(() => { fetch("/data/lite.json").then((r) => r.json()).then(setLite).catch(() => setLite(null)); }, []);
  const mine = useMemo(() => [...follows].map((k) => { const [kind, slug] = k.split(":"); return { kind: kind as FollowKind, slug }; }), [follows]);
  const feed = useMemo(() => {
    if (!lite || !mine.length) return [];
    const lineCompanies = new Set(mine.filter((m) => m.kind === "line").map((m) => lite.lines.find((l) => l.id === m.slug)?.company).filter(Boolean) as string[]);
    return lite.stories.filter((s) => mine.some((m) =>
      (m.kind === "company" && s.c.includes(m.slug)) || (m.kind === "topic" && s.tp.includes(m.slug)) || (m.kind === "person" && s.p.includes(m.slug))) ||
      s.c.some((c) => lineCompanies.has(c)));
  }, [lite, mine]);
  const lines = lite?.lines.filter((l) => mine.some((m) => (m.kind === "line" && m.slug === l.id) || (m.kind === "company" && m.slug === l.company))) ?? [];

  if (!ready) return null;
  return (
    <div>
      <div className="kicker">Personal</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My feed</h1>
      <p className="mt-1 max-w-2xl text-muted">Follow labs, people, topics and release lines. Your feed fills with their news, and you get alerts when they ship.</p>
      {!session && (
        <div className="card mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">Sign in to save follows across devices and get release alerts by email.</p>
          <button type="button" onClick={() => openSignIn()} className="rounded-xl px-5 py-2 font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Sign in</button>
        </div>
      )}
      <h2 className="mt-8 text-lg font-extrabold">{mine.length ? `Following ${mine.length}` : "Pick what to follow"}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {picks.map((p) => (
          <span key={p.kind + p.slug} className="card inline-flex items-center gap-2 py-1 pl-3 pr-1 text-sm font-semibold">
            {p.logo && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={`/logos/${p.logo}.png`} alt="" width={16} height={16} className="rounded bg-white" />)}
            {p.name}
            <FollowButton kind={p.kind} slug={p.slug} label={p.name} size="sm" />
          </span>
        ))}
      </div>
      {lines.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-extrabold">Your release lines</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lines.map((l) => (
              <div key={l.id} className="card p-4">
                <div className="font-bold">{l.name}</div>
                <div className="text-xs text-muted">Last: {l.last ? `${l.last.name} · ${md(l.last.date)}` : "—"}</div>
                <div className="mt-2 text-sm">Expected next: <span className="font-bold text-accent">{l.next ? `~${md(l.next)}` : "no estimate"}</span></div>
              </div>
            ))}
          </div>
        </>
      )}
      {mine.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-extrabold">Latest from what you follow</h2>
          <div className="card mt-3 divide-y divide-line px-4">
            {!lite && <p className="py-5 text-sm text-muted">Loading…</p>}
            {lite && !feed.length && <p className="py-5 text-sm text-muted">Nothing in the last two weeks yet.</p>}
            {feed.slice(0, 80).map((s) => (
              <div key={s.id} className="flex gap-3 py-3">
                <span className="tabular w-9 shrink-0 pt-0.5 text-xs text-faint" suppressHydrationWarning>{ago(s.d)}</span>
                <div className="min-w-0">
                  <a href={s.u} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold leading-snug hover:text-accent">{s.t}</a>
                  <div className="mt-0.5 text-xs text-muted">{s.s}{(s.n ?? 1) > 1 ? ` +${(s.n ?? 1) - 1}` : ""}{s.ty === "official" ? " · Official" : ""}{s.r ? ` · Rumor ${s.cf}/100` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 text-sm text-muted">Alerts arrive under the bell and by email. <Link href="/account/" className="font-semibold text-accent">Email settings</Link></p>
    </div>
  );
}
