import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { topics, topicBySlug } from "@/lib/data";
import { Hub, HubHeader } from "@/components/Blocks";

export const dynamicParams = false;
export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = topicBySlug((await params).slug);
  return t ? { title: `${t.name}: AI News and Rumors`, description: `${t.blurb} Live coverage, rumors rated by confidence and trends.`, alternates: { canonical: `/t/${t.slug}/` } } : {};
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = topicBySlug((await params).slug);
  if (!t) notFound();
  return <Hub filter={{ topic: t.slug }} kind="t" slug={t.slug} header={<HubHeader follow={{ kind: "topic", slug: t.slug }} kicker="Super tab" name={t.name} blurb={t.blurb} />} />;
}
