import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { companies, companyBySlug } from "@/lib/data";
import { Hub, HubHeader } from "@/components/Blocks";
import { Logo } from "@/components/Logo";

export const dynamicParams = false;
export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = companyBySlug((await params).slug);
  return c ? { title: `${c.name} News, Rumors and Next Release`, description: `${c.name}: ${c.blurb} Latest news, leaks rated by confidence, release history and the next expected launch.`, alternates: { canonical: `/c/${c.slug}/` } } : {};
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = companyBySlug((await params).slug);
  if (!c) notFound();
  return (
    <Hub
      filter={{ company: c.slug }}
      kind="c"
      slug={c.slug}
      header={<HubHeader follow={{ kind: "company", slug: c.slug }} kicker="Company" name={c.name} blurb={c.blurb} logo={<Logo slug={c.slug} name={c.name} size={64} />} />}
    />
  );
}
