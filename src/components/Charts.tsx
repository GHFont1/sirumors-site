"use client";
import { useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => { const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const monthYear = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); return `${MONTHS[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`; };

function Tip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: `${x}%`, top: y, marginTop: -8 }}
    >
      {children}
    </div>
  );
}

/** Daily mentions line with a crosshair tooltip. */
export function Sparkline({ data, height = 44, label = "mentions" }: { data: { date: string; value: number }[]; height?: number; label?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300, H = height, P = 3;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => P + (i / Math.max(1, data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${H - P}L${x(0)},${H - P}Z`;
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
        aria-label={`Daily ${label}, last ${data.length} days, peak ${max}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)));
        }}
      >
        <path d={area} fill="var(--series-1)" opacity="0.12" />
        <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {h && <line x1={x(hover!)} x2={x(hover!)} y1={0} y2={H} stroke="var(--faint)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      {h && (
        <Tip x={(x(hover!) / W) * 100} y={0}>
          <span className="font-semibold">{h.value}</span> {label} · {short(h.date)}
        </Tip>
      )}
    </div>
  );
}

/** Vertical bars (one series) with a per-bar tooltip. */
export function Bars({ data, height = 160, label = "", tickEvery = 1 }: { data: { label: string; value: number; tip?: string }[]; height?: number; label?: string; tickEvery?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = max <= 5 ? max : Math.ceil(max / 5) * 5;
  const n = data.length;
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="relative" style={{ height }}>
        {[0.5, 1].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${g * 100}%`, borderColor: "var(--grid)" }}>
            <span className="tabular absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-faint">{Math.round(nice * g)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end pr-6" style={{ gap: 2 }}>
          {data.map((d, i) => (
            <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
              <div
                className="w-full"
                style={{
                  height: `${(d.value / nice) * 100}%`,
                  minHeight: d.value ? 2 : 0,
                  background: "var(--series-1)",
                  opacity: hover == null || hover === i ? 1 : 0.45,
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
          ))}
        </div>
        {hover != null && (
          <Tip x={((hover + 0.5) / n) * 100 * ((100 - 6) / 100)} y={0}>
            <span className="font-semibold">{data[hover].value}</span> {label} · {data[hover].tip ?? data[hover].label}
          </Tip>
        )}
      </div>
      <div className="mt-1 flex pr-6 text-[10px] text-faint" style={{ gap: 2 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 overflow-visible whitespace-nowrap text-center">{i % tickEvery === 0 ? d.label : ""}</div>
        ))}
      </div>
    </div>
  );
}

type TLRelease = { name: string; date: string; source: string };
type TLLine = { id: string; name: string; href?: string; releases: TLRelease[]; expectedNext: string | null; stale?: boolean; retired?: string };

/** Small-multiples release timeline: one row per product line on a shared time axis. */
export function ReleaseTimeline({ lines, from, to, now }: { lines: TLLine[]; from: string; to: string; now: string }) {
  const [hover, setHover] = useState<{ line: string; i: number } | null>(null);
  const t0 = Date.parse(from), t1 = Date.parse(to);
  const pos = (d: string) => ((Date.parse(d) - t0) / (t1 - t0)) * 100;
  const ticks: string[] = [];
  for (let d = new Date(from + "T00:00:00Z"); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 3)) {
    if (d.getTime() >= t0) ticks.push(d.toISOString().slice(0, 10));
  }
  return (
    <div className="space-y-1">
      {lines.map((l) => {
        const rel = l.releases.filter((r) => Date.parse(r.date) >= t0);
        return (
          <div key={l.id} className="grid grid-cols-[110px_1fr] items-center gap-3 sm:grid-cols-[150px_1fr]">
            <div className="truncate text-xs font-semibold sm:text-sm">{l.href ? <a href={l.href} className="link-hover">{l.name}</a> : l.name}</div>
            <div className="relative h-9" onMouseLeave={() => setHover(null)}>
              <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "var(--line)" }} />
              <div className="absolute top-1 bottom-1 w-px" style={{ left: `${pos(now)}%`, background: "var(--faint)", opacity: 0.6 }} />
              {rel.map((r, i) => (
                <button
                  key={r.date + r.name}
                  type="button"
                  aria-label={`${r.name}, ${short(r.date)}`}
                  onMouseEnter={() => setHover({ line: l.id, i })}
                  onFocus={() => setHover({ line: l.id, i })}
                  className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${pos(r.date)}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "var(--series-1)", boxShadow: "0 0 0 2px var(--surface)" }} />
                </button>
              ))}
              {l.expectedNext && !l.retired && !l.stale && Date.parse(l.expectedNext) <= t1 && (
                <span
                  title={`Expected next: ~${short(l.expectedNext)}`}
                  className="absolute top-1/2 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed"
                  style={{ left: `${pos(l.expectedNext)}%`, borderColor: "var(--series-2)" }}
                />
              )}
              {hover?.line === l.id && rel[hover.i] && (
                <Tip x={pos(rel[hover.i].date)} y={4}>
                  <span className="font-semibold">{rel[hover.i].name}</span> · {short(rel[hover.i].date)}, {rel[hover.i].date.slice(0, 4)}
                </Tip>
              )}
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[150px_1fr]">
        <div />
        <div className="relative h-4 text-[10px] text-faint">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(t)}%` }}>{monthYear(t)}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--series-1)" }} /> Release</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-dashed" style={{ borderColor: "var(--series-2)" }} /> Expected next (estimate)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-px" style={{ background: "var(--faint)" }} /> Today</span>
      </div>
    </div>
  );
}
