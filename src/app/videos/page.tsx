import type { Metadata } from "next";
import { NOW, videos } from "@/lib/data";
import { Section } from "@/components/Blocks";
import { VideoGrid } from "@/components/Video";

export const metadata: Metadata = {
  title: "AI Videos: Keynotes, Interviews and Breakdowns",
  description: "The latest AI videos from OpenAI, Anthropic, Google DeepMind, xAI, NVIDIA and Tesla, plus interviews with Sam Altman, Elon Musk, Dario Amodei and more.",
  alternates: { canonical: "/videos/" },
};

export default function VideosPage() {
  const recent = (days: number) => videos.filter((v) => NOW - Date.parse(v.publishedAt) < days * 86400000);
  const official = videos.filter((v) => v.channelType === "official").slice(0, 12);
  const interviews = [...videos.filter((v) => v.channelType === "appearance")].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 12);
  const creators = videos.filter((v) => v.channelType === "creator").slice(0, 12);
  const hot = [...recent(7)].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  return (
    <>
      <div className="kicker">Videos</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Watch the frontier</h1>
      <p className="mt-1 max-w-2xl text-muted">Keynotes and demos straight from the labs, the interviews everyone is quoting, and the best explainers.</p>
      {hot.length > 0 && <Section title="Most watched this week"><VideoGrid items={hot} /></Section>}
      <Section title="From the labs" kicker="Official channels"><VideoGrid items={official} /></Section>
      <Section title="Interviews and appearances" kicker="Altman, Musk, Amodei, Hassabis and more"><VideoGrid items={interviews} /></Section>
      <Section title="Breakdowns" kicker="Podcasts and explainers"><VideoGrid items={creators} /></Section>
    </>
  );
}
