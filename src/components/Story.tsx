import Link from "next/link";
import { companyBySlug, topicBySlug, personBySlug, NOW, foldedInto, type Story } from "@/lib/data";
import { credLabel } from "@/lib/major";
import { Logo } from "./Logo";
import { TimeAgo } from "./TimeAgo";

const STATUS: Record<string, { label: string; color: string }> = {
  whisper: { label: "Whisper", color: "var(--faint)" },
  developing: { label: "Developing", color: "var(--warn)" },
  strong: { label: "Strong", color: "var(--rumor)" },
  confirmed: { label: "Confirmed", color: "var(--good)" },
};

export function RumorMeter({ s, wide = false }: { s: Story; wide?: boolean }) {
  const st = STATUS[s.status ?? "whisper"];
  const c = s.confidence ?? 0;
  return (
    <span className="inline-flex items-center gap-2" title={`Rumor confidence ${c}/100: based on how many independent outlets report it and their track record`}>
      <span className="chip" style={{ color: st.color, borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }}>
        {s.status === "confirmed" ? "✓" : "◉"} {st.label}
      </span>
      <span className="relative inline-block h-1.5 overflow-hidden rounded-full bg-chip" style={{ width: wide ? 120 : 64 }}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${c}%`, background: st.color }} />
      </span>
      <span className="tabular text-xs font-semibold text-muted">{c}</span>
    </span>
  );
}

export function TagChips({ s, max = 4 }: { s: Pick<Story, "companies" | "topics" | "people">; max?: number }) {
  const chips: { href: string; label: string; logo?: string }[] = [
    ...s.companies.map((c) => ({ href: `/c/${c}/`, label: companyBySlug(c)?.name ?? c, logo: c })),
    ...s.people.map((p) => ({ href: `/people/${p}/`, label: personBySlug(p)?.name ?? p })),
    ...s.topics.map((t) => ({ href: `/t/${t}/`, label: topicBySlug(t)?.name ?? t })),
  ].slice(0, max);
  if (!chips.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Link key={c.href} href={c.href} className="chip link-hover">
          {c.logo ? <Logo slug={c.logo} name={c.label} size={14} /> : null}
          {c.label}
        </Link>
      ))}
    </span>
  );
}

export function StoryRow({ s, showSummary = false, rank }: { s: Story; showSummary?: boolean; rank?: number }) {
  return (
    <article className="flex gap-3 border-b border-line py-4 last:border-b-0">
      {rank != null && <span className="tabular w-6 shrink-0 pt-0.5 text-lg font-extrabold text-faint">{rank}</span>}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="font-semibold" style={{ color: s.type === "official" ? "var(--good)" : "var(--text)" }}>{credLabel(s, foldedInto.get(s.id))}</span>
          <span>·</span>
          <TimeAgo iso={s.publishedAt} built={NOW} />
          <span>·</span>
          <Link href={`/forums/new/?c=${s.isRumor ? "rumors" : "general"}&title=${encodeURIComponent(s.title.slice(0, 150))}&link=${encodeURIComponent(s.url)}`} className="link-hover">Discuss</Link>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug sm:text-base">
          <Link href={s.url} className="link-hover">{s.title}</Link>
        </h3>
        {showSummary && s.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {s.isRumor && s.status && <RumorMeter s={s} />}
          <TagChips s={s} />
        </div>
      </div>
    </article>
  );
}

export function StoryList({ items, showSummary, ranked, empty = "Nothing here yet. Check back soon." }: { items: Story[]; showSummary?: boolean; ranked?: boolean; empty?: string }) {
  if (!items.length) return <p className="py-6 text-sm text-muted">{empty}</p>;
  return <div>{items.map((s, i) => <StoryRow key={s.id} s={s} showSummary={showSummary} rank={ranked ? i + 1 : undefined} />)}</div>;
}
