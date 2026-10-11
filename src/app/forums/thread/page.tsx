import type { Metadata } from "next";
import { Suspense } from "react";
import forums from "../../../../config/forums.json";
import { ThreadView } from "@/components/community/Forum";

export const metadata: Metadata = { title: "Thread" };

export default function ThreadPage() {
  return <Suspense fallback={<p className="py-10 text-muted">Loading…</p>}><ThreadView cats={forums.categories} /></Suspense>;
}
