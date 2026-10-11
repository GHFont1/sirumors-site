import type { Metadata } from "next";
import Link from "next/link";
import { companyBySlug, momentum, people, series, storiesFor } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { Sparkline } from "@/components/Charts";

export const metadata: Metadata = {
  title: "People to Follow in AI",
  description: "Sam Altman, Elon Musk, Dario Amodei, Demis Hassabis, Jensen Huang and more: the latest news, interviews and quotes from the people building superintelligence.",
  alternates: { canonical: "/people/" },
};

export default function PeoplePage() {
  const list = [...people].sort((a, b) => momentum("p", b.slug).last7 - momentum("p", a.slug).last7);
  return (
    <>
      <div className="kicker">People</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">The people building it</h1>
      <p className="mt-1 max-w-2xl text-muted">Everything they&apos;re saying and doing, in one place: news, interviews and appearances.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const m = momentum("p", p.slug);
          const co = p.company ? companyBySlug(p.company) : undefined;
          const latest = storiesFor({ person: p.slug })[0];
          return (
            <Link key={p.slug} href={`/people/${p.slug}/`} className="card flex flex-col gap-3 p-4 hover:border-accent">
              <div className="flex items-center gap-3">
                <Logo name={p.name} size={44} round />
                <div className="min-w-0">
                  <div className="font-bold">{p.name}</div>
                  <div className="flex items-center gap-1.5 truncate text-xs text-muted">{co && <Logo slug={co.slug} name={co.name} size={14} />}{p.role}{co ? `, ${co.name}` : ""}</div>
                </div>
                <div className="ml-auto text-right"><div className="tabular text-lg font-extrabold">{m.last7}</div><div className="text-[10px] text-muted">this week</div></div>
              </div>
              <Sparkline data={series("p", p.slug, 30)} height={30} />
              {latest && <p className="line-clamp-2 text-sm text-muted">{latest.title}</p>}
            </Link>
          );
        })}
      </div>
    </>
  );
}
