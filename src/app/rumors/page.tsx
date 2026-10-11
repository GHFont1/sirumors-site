import type { Metadata } from "next";
import { rumors } from "@/lib/data";
import { Section, Stat } from "@/components/Blocks";
import { StoryList } from "@/components/Story";

export const metadata: Metadata = {
  title: "AI Rumor Board: Leaks Rated by Confidence",
  description: "Every AI leak and rumor, rated by how many independent outlets report it and how reliable they are. Marked confirmed when the lab makes it official.",
  alternates: { canonical: "/rumors/" },
};

export default function RumorsPage() {
  const by = (s: string) => rumors.filter((r) => r.status === s);
  return (
    <>
      <div className="kicker">Rumor board</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Rated, not repeated</h1>
      <p className="mt-1 max-w-2xl text-muted">Leaks and reports from the last two weeks. Each gets a confidence score from how many independent outlets carry it and their track record, and flips to Confirmed when the lab announces it.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Strong" value={by("strong").length} sub="70+ confidence" />
        <Stat label="Developing" value={by("developing").length} sub="45 to 69" />
        <Stat label="Whispers" value={by("whisper").length} sub="Single source" />
        <Stat label="Confirmed" value={by("confirmed").length} sub="Lab made it official" tone="good" />
      </div>
      {(["confirmed", "strong", "developing", "whisper"] as const).map((s) =>
        by(s).length ? (
          <Section key={s} title={{ confirmed: "Confirmed", strong: "Strong", developing: "Developing", whisper: "Whispers" }[s]}>
            <div className="card px-4"><StoryList items={by(s).slice(0, s === "whisper" ? 40 : 60)} showSummary /></div>
          </Section>
        ) : null,
      )}
      <Section title="How the score works">
        <div className="card space-y-2 p-5 text-sm text-muted">
          <p>Every story that uses rumor language (reportedly, leaked, sources say, people familiar, code name and similar) is grouped with matching headlines from other outlets. The score starts at 25, gains 14 for each additional independent outlet, and 20 when a high-track-record outlet such as Bloomberg, Reuters, The Information, the Financial Times or The Verge is reporting it.</p>
          <p>Whisper is under 45, Developing is 45 to 69 and Strong is 70 or more. When an official lab announcement matches the rumor, it is marked Confirmed. Scores measure how widely and credibly something is reported, not whether it is true.</p>
        </div>
      </Section>
    </>
  );
}
