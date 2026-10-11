import type { Metadata } from "next";
import forums from "../../../config/forums.json";
import { ForumHome } from "@/components/community/Forum";

export const metadata: Metadata = {
  title: "Forums: Talk AI Releases, Rumors and Superintelligence",
  description: "The SI Rumors community. Discuss every new model launch, rate rumors, and debate the road to superintelligence.",
  alternates: { canonical: "/forums/" },
};

export default function ForumsPage() {
  return <ForumHome cats={forums.categories} />;
}
