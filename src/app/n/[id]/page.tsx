import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NOW, companyBySlug, pageId, pagePath } from "@/lib/data";
import { pageById, pageItems, related } from "@/lib/pages";
import { fmtDate } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { RumorMeter, TagChips } from "@/components/Story";
import { TimeAgo } from "@/components/TimeAgo";

// Our own page for each story, release, reset, tool update and video.
export const dynamicParams = false;
export function generateStaticParams() {
  return pageItems().map((p) => ({ id: pageId(p.id) }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = pageById((await params).id);
  if (!p) return {};
  return { title: p.headline, description: (p.dek ?? p.body[0] ?? "").slice(0, 160), alternates: { canonical: pagePath(p.id) } };
}

const TONE: Record<string, string> = { release: "var(--good)", reset: "var(--accent-2)", rumor: "var(--rumor)", story: "var(--accent)", update: "var(--accent)", video: "var(--accent)" };

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const p = pageById((await params).id);
  if (!p) notFound();
  const co = p.company ? companyBySlug(p.company) : undefined;
  const more = related(p);
  const tone = TONE[p.kind];
  const discuss = `/forums/new/?c=${p.kind === "rumor" ? "rumors" : "general"}&title=${encodeURIComponent(p.headline.slice(0, 150))}&link=${encodeURIComponent(pagePath(p.id))}`;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border px-2.5 py-0.5 font-bold uppercase tracking-wider" style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 55%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}>{p.badge}</span>
        <span className="text-faint">{fmtDate(p.date)} · <TimeAgo iso={p.date} built={NOW} /></span>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{p.headline}</h1>
      {p.dek && <p className="mt-3 text-lg text-muted">{p.dek}</p>}
      {co && (
        <Link href={`/c/${co.slug}/`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold hover:text-accent">
          <Logo slug={co.slug} name={co.name} size={22} /> {co.name}
        </Link>
      )}

      {p.youtubeId ? (
        <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-line bg-black">
          <iframe src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?rel=0&modestbranding=1`} title={p.headline} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        </div>
      ) : p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" referrerPolicy="no-referrer" className="mt-6 max-h-[380px] w-full rounded-xl border border-line object-cover" />
      ) : null}

      <div className="mt-6 space-y-4 text-[17px] leading-relaxed">
        {p.body.length ? p.body.map((t, i) => <p key={i}>{t}</p>) : <p className="text-muted">{p.headline}.</p>}
      </div>

      {p.quote && (
        <blockquote className="mt-6 border-l-4 pl-4 text-[15px] italic text-muted" style={{ borderColor: tone }}>
          &ldquo;{p.quote.text}&rdquo;
          <footer className="mt-1 text-xs not-italic text-faint">{p.quote.by}</footer>
        </blockquote>
      )}

      <div className="card mt-8 grid grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
        {p.facts.map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</div>
            <div className="mt-0.5 text-sm font-semibold">{v}</div>
          </div>
        ))}
        {p.story?.isRumor && p.story.status && <div className="col-span-2 sm:col-span-3"><RumorMeter s={p.story} wide /></div>}
      </div>

      {p.outlets.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          <span className="font-semibold text-text">{p.kind === "reset" || p.kind === "release" ? "Source" : "Reported by"}:</span> {p.outlets.join(", ")}
        </p>
      )}
      

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TagChips s={p} max={6} />
        <Link href={discuss} className="text-sm font-bold text-accent hover:underline">Discuss in the forums →</Link>
      </div>

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold tracking-tight">More on {co?.name ?? "this"}</h2>
          <ol className="card mt-3 divide-y divide-line">
            {more.map((x) => (
              <li key={x.id}>
                <Link href={pagePath(x.id)} className="flex items-baseline gap-3 p-3 hover:bg-chip">
                  <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-wider text-faint">{fmtDate(x.date, false)}</span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{x.headline}</span>
                  <span className="shrink-0 text-[11px] font-bold text-muted">{x.badge}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
