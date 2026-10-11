import Link from "next/link";
import { NOW, companyBySlug, type Board, type FrontierModel, type Market, type XReset } from "@/lib/data";
import { compact, daysBetween, fmtDate } from "@/lib/format";
import { Logo } from "./Logo";

const pctOf = (p: number) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

/** A probability meter: name, odds, a bar, and the day's move. */
export function OddsRow({ name, p, change, lead = false, tone }: { name: string; p: number; change?: number | null; lead?: boolean; tone?: string }) {
  const color = tone ?? (lead ? "var(--accent-2)" : "var(--accent)");
  const move = change != null && Math.abs(change) >= 0.005 ? Math.round(change * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={`min-w-0 truncate ${lead ? "font-bold" : "font-semibold"}`}>{name}</span>
        <span className="flex shrink-0 items-baseline gap-2">
          {move !== 0 && <span className="tabular text-[11px] font-bold" style={{ color: move > 0 ? "var(--good)" : "var(--bad)" }}>{move > 0 ? "▲" : "▼"}{Math.abs(move)}</span>}
          <span className={`tabular font-extrabold ${lead ? "text-lg" : "text-base"}`} style={{ color: lead ? color : undefined }}>{pctOf(p)}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip">
        <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, p * 100)}%`, background: lead ? "linear-gradient(90deg, var(--accent), var(--accent-2))" : color, opacity: lead ? 1 : 0.75 }} />
      </div>
    </div>
  );
}

export function MarketCard({ m, rows = 4 }: { m: Market; rows?: number }) {
  const yesNo = m.binary && m.outcomes[0]?.name === "Yes";
  const list = yesNo ? m.outcomes.slice(0, 1) : m.outcomes.slice(0, rows);
  const leadP = Math.max(...m.outcomes.map((o) => o.yes));
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start gap-3">
        {m.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.image} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover" />
        ) : <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-chip text-lg">📊</span>}
        <h3 className="text-[15px] font-bold leading-snug">{m.title}</h3>
      </div>
      <div className="mt-3 flex-1">
        {yesNo ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="tabular text-3xl font-extrabold" style={{ color: "var(--accent-2)" }}>{pctOf(m.outcomes[0].yes)}</span>
              <span className="text-sm font-semibold text-muted">chance</span>
              {m.outcomes[0].change != null && Math.abs(m.outcomes[0].change) >= 0.005 && (
                <span className="tabular text-xs font-bold" style={{ color: m.outcomes[0].change > 0 ? "var(--good)" : "var(--bad)" }}>{m.outcomes[0].change > 0 ? "▲" : "▼"}{Math.abs(Math.round(m.outcomes[0].change * 100))} today</span>
              )}
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, m.outcomes[0].yes * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
            </div>
          </div>
        ) : (
          list.map((o) => <OddsRow key={o.name} name={o.name} p={o.yes} change={o.change} lead={o.yes === leadP} />)
        )}
      </div>
      <div className="mt-3 text-xs text-faint">
        <span className="tabular">${compact(m.volume)} traded{m.endDate ? ` · ends ${fmtDate(m.endDate, false)}` : ""}</span>
      </div>
    </article>
  );
}

/** A ranking board: the #1 model big, the chasers with gap bars. */
export function RankBoard({ b, rows = 5, compactCard = false }: { b: Board; rows?: number; compactCard?: boolean }) {
  const [first, ...rest] = b.top;
  const shown = rest.slice(0, rows - 1);
  const low = Math.min(...b.top.slice(0, rows).map((r) => r.rating));
  const span = Math.max(1, first.rating - low);
  const c = first.company ? companyBySlug(first.company) : undefined;
  const held = b.leaderSince ? daysBetween(b.leaderSince, NOW) : null;
  return (
    <article className="card flex flex-col p-4">
      <div className="kicker">{b.label}</div>
      <div className="mt-2 flex items-center gap-3">
        <Logo slug={c?.slug} name={c?.name ?? first.org} size={compactCard ? 34 : 42} />
        <div className="min-w-0">
          <div className={`truncate font-extrabold tracking-tight ${compactCard ? "text-lg" : "text-xl"}`}>👑 {first.model}</div>
          <div className="text-xs text-muted">
            {c?.name ?? first.org} · <span className="tabular font-semibold">{first.rating} {b.unit}</span>
            {held != null && held >= 2 ? ` · #1 for ${held}d` : b.prevLeader ? ` · new #1, passed ${b.prevLeader}` : ""}
          </div>
        </div>
      </div>
      {!compactCard && (
        <ol className="mt-3 space-y-1.5">
          {shown.map((r, i) => {
            const rc = r.company ? companyBySlug(r.company) : undefined;
            return (
              <li key={r.raw} className="flex items-center gap-2.5 text-sm">
                <span className="tabular w-4 text-xs font-bold text-faint">{i + 2}</span>
                <Logo slug={rc?.slug} name={rc?.name ?? r.org} size={18} />
                <span className="w-36 truncate font-semibold sm:w-40">{r.model}</span>
                <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-chip">
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${12 + 88 * ((r.rating - low) / span)}%`, background: "var(--accent)", opacity: 0.7 }} />
                </span>
                <span className="tabular w-12 text-right text-xs text-muted">−{Math.round((first.rating - r.rating) * 10) / 10}</span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-auto pt-3 text-[11px] text-faint">{b.blurb}{b.published ? ` · Arena, ${fmtDate(b.published, false)}` : ""}</div>
    </article>
  );
}

/** The frontier list: one ranked line per model, each opening its reference page. */
export function FrontierList({ items, limit = 10 }: { items: FrontierModel[]; limit?: number }) {
  if (!items.length) return <p className="py-3 text-sm text-muted">Rankings are loading.</p>;
  return (
    <ol className="space-y-0.5">
      {items.slice(0, limit).map((m) => {
        const co = m.company ? companyBySlug(m.company) : undefined;
        return (
          <li key={m.slug}>
            <Link href={`/models/${m.slug}/`} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-chip">
              <span className={`tabular w-5 text-right text-sm font-extrabold ${m.rank === 1 ? "" : "text-faint"}`} style={m.rank === 1 ? { color: "var(--accent-2)" } : undefined}>{m.rank}</span>
              <Logo slug={co?.slug} name={m.orgName} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{m.rank === 1 ? "👑 " : ""}{m.model}</span>
                <span className="block truncate text-[11px] text-muted">{co?.name ?? m.orgName}</span>
              </span>
              <span className="tabular text-xs font-bold text-muted">{Math.round(m.score)}</span>
              <span aria-hidden className="text-faint">›</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Small "best at" tile for the home page strip. */
export function BestTile({ b }: { b: Board }) {
  const first = b.top[0];
  const c = first.company ? companyBySlug(first.company) : undefined;
  return (
    <Link href={`/rankings/#${b.id}`} className="card flex items-center gap-3 p-3 hover:border-accent">
      <Logo slug={c?.slug} name={c?.name ?? first.org} size={34} />
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{b.label}</div>
        <div className="truncate text-[15px] font-extrabold">{first.model}</div>
      </div>
    </Link>
  );
}

const ago = (iso: string) => {
  const h = Math.max(0, (NOW - Date.parse(iso)) / 3600000);
  return h < 1 ? "just now" : h < 24 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
};

const byLine = (r: XReset) => (r.byName ?? (r.by === "thsottiaux" ? "Tibo" : `@${r.by}`)) + " on X";

/** Usage resets as the labs posted them on X, with the gap since that lab's reset before. */
export function ResetList({ items, limit = 8, quotes = false }: { items: XReset[]; limit?: number; quotes?: boolean }) {
  if (!items.length) return <p className="py-3 text-sm text-muted">No resets recorded yet.</p>;
  return (
    <ol className="divide-y divide-line">
      {items.slice(0, limit).map((r, i) => {
        const prev = items.slice(i + 1).find((x) => x.company === r.company);
        const co = companyBySlug(r.company);
        const gap = prev ? daysBetween(prev.date.slice(0, 10), r.date.slice(0, 10)) : null;
        const tone = r.banked ? "var(--accent)" : "var(--accent-2)";
        return (
          <li key={r.id} className="flex gap-3 py-2.5">
            <div className="w-10 shrink-0 text-center">
              <div className="text-[10px] font-bold uppercase text-faint">{fmtDate(r.date, false).split(" ")[0]}</div>
              <div className="tabular text-lg font-extrabold leading-none">{new Date(r.date).getUTCDate()}</div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold"><Logo slug={co?.slug} name={r.product} size={14} />{r.product}</span>
                <span className="rounded-full border px-2 font-bold uppercase tracking-wider" style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 55%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}>{r.status === "coming" ? "Coming" : r.banked ? "Banked" : "Reset"}</span>
                <span className="text-faint">{ago(r.date)}{gap != null ? ` · ${gap === 0 ? "same day" : `${gap}d after last`}` : ""}</span>
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[13px] font-semibold leading-snug link-hover">{r.title}</a>
              {quotes && <p className="mt-0.5 line-clamp-2 text-xs text-muted">&ldquo;{r.quote}&rdquo; <span className="text-faint">{byLine(r)}</span></p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Each lab's last reset at a glance. */
export const RESET_LABS: [string, string][] = [["openai", "OpenAI"], ["anthropic", "Claude"], ["xai", "Grok"], ["google", "Gemini"]];
export function LabResets({ items }: { items: XReset[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {RESET_LABS.map(([slug, product]) => {
        const last = items.find((r) => r.company === slug && r.status === "done");
        const coming = items.find((r) => r.company === slug && r.status === "coming" && (!last || r.date > last.date));
        const r = coming ?? last;
        const inner = (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted"><Logo slug={slug} name={product} size={16} />{product}</span>
            <span className="mt-1 block text-lg font-extrabold leading-tight tracking-tight">{coming ? `Coming ${fmtDate(coming.date, false)}` : last ? ago(last.date) : "None yet"}</span>
            <span className="block text-[10.5px] text-faint">{coming ? "announced" : last ? `last reset · ${fmtDate(last.date, false)}` : "no reset posted on X"}</span>
          </>
        );
        return r ? (
          <a key={slug} href={r.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line p-2.5 hover:border-accent">{inner}</a>
        ) : (
          <div key={slug} className="rounded-lg border border-line p-2.5 opacity-70">{inner}</div>
        );
      })}
    </div>
  );
}
