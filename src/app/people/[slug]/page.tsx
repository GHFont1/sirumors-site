import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { people, personBySlug, companyBySlug } from "@/lib/data";
import { Hub, HubHeader } from "@/components/Blocks";
import { Logo } from "@/components/Logo";

export const dynamicParams = false;
export function generateStaticParams() {
  return people.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = personBySlug((await params).slug);
  return p ? { title: `${p.name}: Latest News, Interviews and Quotes`, description: `Everything ${p.name} is saying and doing in AI: news, interviews and appearances, updated all day.`, alternates: { canonical: `/people/${p.slug}/` } } : {};
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = personBySlug((await params).slug);
  if (!p) notFound();
  const co = p.company ? companyBySlug(p.company) : undefined;
  return (
    <Hub
      filter={{ person: p.slug }}
      kind="p"
      slug={p.slug}
      header={
        <HubHeader
          kicker="Person"
          name={p.name}
          blurb={`${p.role}${co ? `, ${co.name}` : ""}. News, interviews and appearances.`}
          logo={<Logo name={p.name} size={64} round />}
          extra={
            <div className="mt-2 flex flex-wrap gap-2">
              {p.x && <a href={`https://x.com/${p.x}`} target="_blank" rel="noopener noreferrer" className="chip link-hover">𝕏 @{p.x}</a>}
              {co && <a href={`/c/${co.slug}/`} className="chip link-hover"><Logo slug={co.slug} name={co.name} size={14} /> {co.name}</a>}
            </div>
          }
        />
      }
    />
  );
}
