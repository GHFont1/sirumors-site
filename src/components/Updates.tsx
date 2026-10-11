import Link from "next/link";
import { NOW, companyBySlug } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import type { Update } from "@/lib/updates";
import { Logo } from "./Logo";
import { TimeAgo } from "./TimeAgo";
import { UpdateFilter } from "./UpdateFilter";

const ICON: Record<string, string> = { release: "🚀", breaking: "⚡", rumor: "◉", official: "✓", reset: "↻", update: "⬆", hot: "🔥", video: "▶" };

function badgeStyle(u: Update): React.CSSProperties {
  if (u.kind === "release") return { background: "linear-gradient(90deg, var(--accent), var(--accent-2))", color: "#fff" };
  if (u.kind === "rumor") {
    if (u.status === "confirmed") return { background: "var(--good)", color: "#fff" };
    if (u.status === "whisper") return { background: "transparent", color: "var(--rumor)", boxShadow: "inset 0 0 0 1.5px var(--rumor)" };
    return { background: "var(--rumor)", color: "#fff" };
  }
  const bg: Record<string, string> = { breaking: "var(--bad)", official: "var(--accent)", reset: "var(--accent-2)", update: "#2563eb", hot: "#ea580c", video: "var(--text)" };
  if (u.badge === "Developing") return { background: "transparent", color: "var(--bad)", boxShadow: "inset 0 0 0 1.5px var(--bad)" };
  return { background: bg[u.kind], color: u.kind === "video" ? "var(--bg)" : "#fff" };
}

export function Badge({ u, big = false }: { u: Update; big?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md font-extrabold uppercase tracking-wide ${big ? "px-2.5 py-1 text-xs" : "px-2 py-[3px] text-[10.5px]"}`} style={badgeStyle(u)}>
      <span aria-hidden>{u.status === "confirmed" ? "✓" : ICON[u.kind]}</span>
      {u.badge}
      {u.kind === "rumor" && u.confidence != null && u.status !== "confirmed" && <span className="tabular opacity-80">· {u.confidence}%</span>}
    </span>
  );
}

const ext = (u: string) => /^https?:/.test(u);

function Headline({ u, className }: { u: Update; className: string }) {
  return ext(u.url)
    ? <a href={u.url} target="_blank" rel="noopener noreferrer" className={`${className} link-hover`}>{u.headline}</a>
    : <Link href={u.url} className={`${className} link-hover`}>{u.headline}</Link>;
}

function Meta({ u }: { u: Update }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="font-semibold">{u.source}</span>
      {u.sources > 1 && <span className="font-semibold text-text">{u.sources} outlets</span>}
      {u.points ? <span>▲ {u.points}</span> : null}
      <Link href={u.discuss} className="font-semibold text-accent hover:underline">Discuss →</Link>
    </div>
  );
}

function Who({ u }: { u: Update }) {
  const c = u.company ? companyBySlug(u.company) : undefined;
  if (!c) return null;
  return (
    <Link href={`/c/${c.slug}/`} className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-accent">
      <Logo slug={c.slug} name={c.name} size={16} />{c.name.replace(/ AI$/, "")}
    </Link>
  );
}

export function UpdateCard({ u }: { u: Update }) {
  const c = u.company ? companyBySlug(u.company) : undefined;
  return (
    <article data-kind={u.kind} className="flex gap-3.5 border-b border-line py-4 last:border-b-0">
      <div className="hidden shrink-0 pt-0.5 sm:block">
        {c ? <Logo slug={c.slug} name={c.name} size={40} /> : <Logo name={u.source || "SI"} size={40} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Badge u={u} />
          <Who u={u} />
          <span className="text-xs text-faint"><TimeAgo iso={u.date} built={NOW} /></span>
        </div>
        <h3 className="mt-1.5 text-[16px] font-bold leading-snug sm:text-[17px]"><Headline u={u} className="" /></h3>
        {u.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{u.summary}</p>}
        <Meta u={u} />
      </div>
      {u.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="hidden h-[76px] w-[120px] shrink-0 rounded-lg border border-line object-cover sm:block" />
      )}
    </article>
  );
}

/** Big lead card for the top update. */
export function LeadCard({ u }: { u: Update }) {
  const c = u.company ? companyBySlug(u.company) : undefined;
  return (
    <article className="card overflow-hidden">
      <div className="relative flex h-40 items-center justify-center sm:h-52" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 85%, #000), color-mix(in srgb, var(--accent-2) 80%, #000))" }}>
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
        ) : c ? (
          <Logo slug={c.slug} name={c.name} size={84} />
        ) : null}
        <div className="absolute left-3 top-3"><Badge u={u} big /></div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2.5"><Who u={u} /><span className="text-xs text-faint"><TimeAgo iso={u.date} built={NOW} /></span></div>
        <h2 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]"><Headline u={u} className="" /></h2>
        {u.summary && <p className="mt-2 line-clamp-3 text-[15px] text-muted">{u.summary}</p>}
        <Meta u={u} />
      </div>
    </article>
  );
}

/** Smaller cards beside the lead. */
export function SubLead({ u }: { u: Update }) {
  return (
    <article className="card flex flex-col p-4">
      <div className="flex flex-wrap items-center gap-2"><Badge u={u} /><Who u={u} /></div>
      <h3 className="mt-2 text-[15px] font-bold leading-snug"><Headline u={u} className="" /></h3>
      <div className="mt-auto pt-2 text-xs text-faint"><TimeAgo iso={u.date} built={NOW} />{u.sources > 1 ? ` · ${u.sources} outlets` : ""}</div>
    </article>
  );
}

/** "Just in" strip: the newest few updates, one line each. */
export function JustIn({ items }: { items: Update[] }) {
  return (
    <div className="card no-scrollbar flex items-center gap-4 overflow-x-auto px-3 py-2.5">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide"><span className="live-dot" /> Just in</span>
      {items.map((u) => (
        <span key={u.id} className="flex shrink-0 items-center gap-2 text-sm">
          <Badge u={u} />
          {ext(u.url)
            ? <a href={u.url} target="_blank" rel="noopener noreferrer" className="max-w-[300px] truncate font-semibold link-hover">{u.headline}</a>
            : <Link href={u.url} className="max-w-[300px] truncate font-semibold link-hover">{u.headline}</Link>}
        </span>
      ))}
    </div>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso).toISOString().slice(0, 10);
  const today = new Date(NOW).toISOString().slice(0, 10);
  const yest = new Date(NOW - 86400000).toISOString().slice(0, 10);
  if (d === today) return "Today";
  if (d === yest) return "Yesterday";
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(d + "T12:00:00Z").getUTCDay()];
  return `${wd}, ${fmtDate(d, false)}`;
}

/** The full stream, grouped by day, with type filters. */
export function UpdatesStream({ items, filters = true }: { items: Update[]; filters?: boolean }) {
  if (!items.length) return <p className="card p-6 text-sm text-muted">No updates yet. Check back soon.</p>;
  const days: { label: string; list: Update[] }[] = [];
  for (const u of items) {
    const label = dayLabel(u.date);
    const last = days[days.length - 1];
    if (last?.label === label) last.list.push(u); else days.push({ label, list: [u] });
  }
  const counts: Record<string, number> = {};
  for (const u of items) counts[u.kind] = (counts[u.kind] ?? 0) + 1;
  const body = (
    <div className="space-y-5">
      {days.map((d) => (
        <div key={d.label} className="uday">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide">{d.label}</h3>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="card px-4">{d.list.map((u) => <UpdateCard key={u.id} u={u} />)}</div>
        </div>
      ))}
    </div>
  );
  return filters ? <UpdateFilter counts={counts}>{body}</UpdateFilter> : body;
}
