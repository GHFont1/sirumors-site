import Link from "next/link";
import { NOW, companyBySlug, type Board, type Market, type ResetEvent } from "@/lib/data";
import { compact, daysBetween, fmtDate } from "@/lib/format";
import { Logo } from "./Logo";

const pctOf = (p: number) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

/** A Polymarket-style probability meter: name, odds, a bar, and the day's move. */
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
        ) : <Logo name="Polymarket" size={40} />}
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-bold leading-snug link-hover">{m.title}</a>
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
      <div className="mt-3 flex items-center justify-between text-xs text-faint">
        <span className="tabular">${compact(m.volume)} vol{m.endDate ? ` · ends ${fmtDate(m.endDate, false)}` : ""}</span>
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-accent">Polymarket ↗</a>
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

const PRODUCT_TONE: Record<string, string> = { OpenAI: "var(--accent-2)", Anthropic: "#d97757", Google: "#3b82f6" };
const PRODUCT_SLUG: Record<string, string> = { OpenAI: "openai", Anthropic: "anthropic", Google: "google" };

/** Past limit resets with the gap since the one before. */
export function ResetList({ items, limit = 8 }: { items: ResetEvent[]; limit?: number }) {
  if (!items.length) return <p className="py-3 text-sm text-muted">No resets recorded yet.</p>;
  return (
    <ol className="divide-y divide-line">
      {items.slice(0, limit).map((r, i) => {
        const prev = items.slice(i + 1).find((x) => x.product === r.product);
        const gap = prev ? daysBetween(prev.date, r.date) : null;
        const tone = PRODUCT_TONE[r.product] ?? "var(--muted)";
        return (
          <li key={r.id} className="flex gap-3 py-2.5">
            <div className="w-11 shrink-0 text-center">
              <div className="text-[10px] font-bold uppercase text-faint">{fmtDate(r.date, false).split(" ")[0]}</div>
              <div className="tabular text-lg font-extrabold leading-none">{new Date(r.date).getUTCDate()}</div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 font-bold uppercase tracking-wider" style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 55%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}>{PRODUCT_SLUG[r.product] && <Logo slug={PRODUCT_SLUG[r.product]} name={r.product} size={11} />}{r.product}</span>
                <span className="text-faint">{daysBetween(r.date, NOW)}d ago{gap != null ? ` · ${gap}d after last` : ""}</span>
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug link-hover">{r.title}</a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
