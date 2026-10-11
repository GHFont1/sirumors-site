import type { Metadata } from "next";
import { Suspense } from "react";
import forums from "../../../../config/forums.json";
import { NewThread } from "@/components/community/Forum";

export const metadata: Metadata = { title: "Start a thread", robots: { index: false } };

export default function NewThreadPage() {
  return <Suspense fallback={null}><NewThread cats={forums.categories} /></Suspense>;
}
