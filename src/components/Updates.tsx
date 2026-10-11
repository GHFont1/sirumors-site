import Link from "next/link";
import { NOW, companyBySlug } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import type { Update } from "@/lib/updates";
import { Logo } from "./Logo";
import { TimeAgo } from "./TimeAgo";
import { UpdateFilter } from "./UpdateFilter";

const ICON: Record<string, string> = { release: "🚀", breaking: "⚡", rumor: "◉", official: "✓", reset: "↻", update: "⬆", hot: "🔥", video: "▶" };

// Credit Compound style: outlined pill, tinted fill, colored text, soft glow.
const TONE: Record<string, string> = {
  release: "var(--accent)", breaking: "#ef4444", rumor: "var(--rumor)", confirmed: "var(--good)", official: "var(--accent-2)",
  reset: "var(--accent-2)", update: "#3b82f6", hot: "#f97316", video: "var(--muted)", whisper: "var(--faint)",
};
const toneFor = (u: Update) => (u.status === "confirmed" ? TONE.confirmed : u.status === "whisper" ? TONE.whisper : TONE[u.kind]);

function pill(color: string, glow = false): React.CSSProperties {
  return {
    color,
    borderColor: `color-mix(in srgb, ${color} 60%, transparent)`,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    boxShadow: glow ? `0 0 18px color-mix(in srgb, ${color} 22%, transparent)` : undefined,
  };
}
const pillClass = (big: boolean) => `inline-flex shrink-0 items-center gap-1 rounded-full border font-bold uppercase tracking-wider ${big ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"}`;

export function Badge({ u, big = false }: { u: Update; big?: boolean }) {
  const strong = u.kind === "release" || u.kind === "breaking" || u.status === "strong" || u.status === "confirmed";
  return (
    <span className={pillClass(big)} style={u.kind === "release"
      ? { color: "#fff", borderColor: "transparent", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", boxShadow: "0 0 20px color-mix(in srgb, var(--accent) 35%, transparent)" }
      : pill(toneFor(u), strong)}>
      <span aria-hidden>{u.status === "confirmed" ? "✓" : ICON[u.kind]}</span>
      {u.badge}
      {u.kind === "rumor" && u.confidence != null && u.status !== "confirmed" && <span className="tabular opacity-75">· {u.confidence}%</span>}
    </span>
  );
}

/** The second badge: how fresh it is, red and glowing while it's new. */
export function TimingBadge({ u, big = false }: { u: Update; big?: boolean }) {
  const h = (NOW - Date.parse(u.date)) / 3600000;
  const sameDay = u.date.slice(0, 10) === new Date(NOW).toISOString().slice(0, 10);
  const label = h < 3 ? "Just in" : h < 12 ? "New" : sameDay ? "Today" : null;
  if (!label) return null;
  return <span className={pillClass(big)} style={pill("#ef4444", true)}>{label}</span>;
}

/** Big logo tile on the left of every update, like Credit Compound's card art. */
export function Emblem({ u, compact = true }: { u: Update; compact?: boolean }) {
  const c = u.company ? companyBySlug(u.company) : undefined;
  const name = c?.name.replace(/ AI$/, "") ?? u.source;
  const tone = u.kind === "release" ? "var(--accent)" : toneFor(u);
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border ${compact ? "h-24 w-32" : "h-28 w-40"}`}
      style={{ borderColor: `color-mix(in srgb, ${tone} 40%, var(--line))`, background: `radial-gradient(circle at top, color-mix(in srgb, ${tone} 22%, transparent), transparent 65%), var(--surface-2)` }}>
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent), var(--accent-2), transparent)" }} />
      <div className="px-2 text-center">
        <div className="flex justify-center" style={{ filter: `drop-shadow(0 0 14px color-mix(in srgb, ${tone} 35%, transparent))` }}>
          {c ? <Logo slug={c.slug} name={c.name} size={compact ? 44 : 52} /> : <Logo name={name || "SI"} size={compact ? 44 : 52} />}
        </div>
        <div className="mt-2 line-clamp-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{name}</div>
      </div>
    </div>
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

/** One update, Credit Compound style: logo tile, badge and date, headline, two lines, Read more. */
export function UpdateCard({ u }: { u: Update }) {
  const c = u.company ? companyBySlug(u.company) : undefined;
  return (
    <article data-kind={u.kind} className="card flex gap-4 p-4 transition-colors hover:border-accent sm:p-5">
      <div className="hidden sm:block"><Emblem u={u} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge u={u} />
          <TimingBadge u={u} />
          <span className="tabular text-faint">{fmtDate(u.date, false)}</span>
        </div>
        <h3 className="mt-2 text-[17px] font-bold leading-snug"><Headline u={u} className="" /></h3>
        {u.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{u.summary}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {ext(u.url)
            ? <a href={u.url} target="_blank" rel="noopener noreferrer" className="mr-1 text-sm font-bold text-accent hover:underline">Read more →</a>
            : <Link href={u.url} className="mr-1 text-sm font-bold text-accent hover:underline">Read more →</Link>}
          {c && <Link href={`/c/${c.slug}/`} className="chip hover:text-accent" style={{ padding: "2px 9px", fontSize: 11 }}>{c.name.replace(/ AI$/, "")}</Link>}
          {u.sources > 1 && <span className="chip" style={{ padding: "2px 9px", fontSize: 11 }}>{u.sources} outlets</span>}
          <span className="chip" style={{ padding: "2px 9px", fontSize: 11 }}>{u.source}</span>
        </div>
      </div>
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
        <div className="absolute left-3 top-3 flex gap-1.5 rounded-full p-1 backdrop-blur-md" style={{ background: "rgba(8,10,16,0.72)" }}><Badge u={u} big /><TimingBadge u={u} big /></div>
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
      <div className="flex flex-wrap items-center gap-2"><Badge u={u} /><TimingBadge u={u} /><Who u={u} /></div>
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

/** The update list with type filters. */
export function UpdatesStream({ items, filters = true }: { items: Update[]; filters?: boolean }) {
  if (!items.length) return <p className="card p-6 text-sm text-muted">No updates yet. Check back soon.</p>;
  const counts: Record<string, number> = {};
  for (const u of items) counts[u.kind] = (counts[u.kind] ?? 0) + 1;
  const body = <div className="space-y-3">{items.map((u) => <UpdateCard key={u.id} u={u} />)}</div>;
  return filters ? <UpdateFilter counts={counts}>{body}</UpdateFilter> : body;
}
