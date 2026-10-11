"use client";
import { useMemo, useState } from "react";

export type LiteStory = { id: string; title: string; url: string; source: string; type: string; publishedAt: string; isRumor: boolean; status?: string; confidence?: number; companies: string[]; sourceCount?: number; points?: number };

const TYPES = [
  { k: "all", label: "All" },
  { k: "official", label: "Official" },
  { k: "press", label: "Press" },
  { k: "community", label: "Community" },
  { k: "rumor", label: "Rumors" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d`;
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function FeedFilter({ items, companies }: { items: LiteStory[]; companies: { slug: string; name: string; logo: boolean }[] }) {
  const [type, setType] = useState("all");
  const [co, setCo] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((s) =>
      (type === "all" || (type === "rumor" ? s.isRumor : s.type === type || (type === "press" && s.type === "analysis"))) &&
      (!co || s.companies.includes(co)) &&
      (!needle || s.title.toLowerCase().includes(needle) || s.source.toLowerCase().includes(needle)));
  }, [items, type, co, q]);
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TYPES.map((t) => (
            <button key={t.k} type="button" onClick={() => setType(t.k)} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ background: type === t.k ? "var(--chip)" : "transparent", color: type === t.k ? "var(--text)" : "var(--muted)" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <select value={co} onChange={(e) => setCo(e.target.value)} aria-label="Company" className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm">
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search headlines" aria-label="Search headlines" className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm sm:w-56" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{list.length} stories</p>
      <div className="card mt-2 divide-y divide-line px-4">
        {list.slice(0, limit).map((s) => (
          <div key={s.id} className="flex gap-3 py-3">
            <span className="tabular w-9 shrink-0 pt-0.5 text-xs text-faint" suppressHydrationWarning>{ago(s.publishedAt)}</span>
            <div className="min-w-0">
              <a href={s.url} className="text-[15px] font-semibold leading-snug hover:text-accent">{s.title}</a>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span className="font-semibold">{s.source}</span>
                {(s.sourceCount ?? 1) > 1 && <span>+{(s.sourceCount ?? 1) - 1} more</span>}
                {s.type === "official" && <span style={{ color: "var(--good)" }}>Official</span>}
                {s.isRumor && <span style={{ color: "var(--rumor)" }}>Rumor · {s.confidence ?? "?"}/100</span>}
                {s.points ? <span>▲ {s.points}</span> : null}
              </div>
            </div>
          </div>
        ))}
        {!list.length && <p className="py-6 text-sm text-muted">No stories match.</p>}
      </div>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit(limit + 60)} className="mt-4 w-full rounded-xl border border-line bg-surface py-2.5 text-sm font-semibold hover:border-accent">
          Show more
        </button>
      )}
    </div>
  );
}
