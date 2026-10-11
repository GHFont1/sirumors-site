import type { Metadata } from "next";
import { notFound } from "next/navigation";
import forums from "../../../../../config/forums.json";
import { CategoryView } from "@/components/community/Forum";

export const dynamicParams = false;
export function generateStaticParams() {
  return forums.categories.map((c) => ({ cat: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }): Promise<Metadata> {
  const { cat } = await params;
  const c = forums.categories.find((x) => x.slug === cat);
  return c ? { title: `${c.name} Forum`, description: c.blurb, alternates: { canonical: `/forums/c/${c.slug}/` } } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  const c = forums.categories.find((x) => x.slug === cat);
  if (!c) notFound();
  return <CategoryView cat={c} cats={forums.categories} />;
}
