import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = {
  title: "FAQ: How SI Rumors Works",
  description: "Answers about SI Rumors: what counts as news, how rumor confidence scores work, what a usage reset is, how release estimates and the frontier model ranking are made, alerts and the daily digest.",
  alternates: { canonical: "/faq/" },
};

const QA: [string, string, React.ReactNode?][] = [
  ["What is SI Rumors?", "SI Rumors is an independent news site that tracks the race to superintelligence: AI model releases, usage resets, rumors and leaks, the best frontier models, and the companies and people behind them. It updates every 30 minutes."],
  ["What does SI stand for?", "Superintelligence."],
  ["How do you decide what is news?", "A story is published when a company announces something itself, when major news outlets report it, when it is a significant government action, or when it is a rumor with real backing. Opinion pieces, commentary and minor posts are left out."],
  ["Who writes the stories?", "Every story is researched and written for SI Rumors in our own words, with the help of AI tools under strict editorial rules: only facts the research supports, no invented details, no copying, and unconfirmed information is always labeled as unconfirmed."],
  ["How do rumor confidence scores work?", "Each rumor gets a score from 0 to 100 based on how many independent, credible outlets report it and their track record. Scores fall into Whisper, Rumor, Strong rumor and Confirmed. A rumor becomes Confirmed when the company makes it official. The score reflects how widely and credibly something is reported, not a guarantee that it is true."],
  ["What is a usage reset?", "AI subscriptions like ChatGPT and Codex, Claude, Gemini and Grok limit how much you can use them in a period. A reset restores everyone's limits early. A banked reset is one you can save and use when you choose. SI Rumors records a reset only when the company or its staff announce it, and emails an alert the moment one lands."],
  ["How are next-release dates estimated?", "A release counts only when the company announces it itself. The expected next date is the last release plus the typical gap between that product line's recent releases. It is an estimate based on past timing, not a leak."],
  ["How is the Best Frontier Models ranking made?", "Each model's placing is averaged across overall, hard-prompt, coding and agent leaderboards built from large numbers of head-to-head human votes. A model needs to appear on at least two of them to be ranked. Click any model to see its full results."],
  ["Where do the odds come from?", "The odds come from public prediction markets and show what traders collectively expect. They are not predictions by SI Rumors and are not betting or financial advice."],
  ["How do I get alerts?", "Enter your email in the Daily digest box on any page for a short morning email with the day's biggest AI news, plus instant emails when a usage reset or a major release lands. With a free account you can also follow specific companies, people and products and choose exactly which emails you get."],
  ["How do I unsubscribe?", "Every email has a one-click unsubscribe link. Account holders can also change any email setting on the Settings page."],
  ["Is SI Rumors free?", "Yes. Reading, alerts, the digest and the forums are free."],
  ["Are you affiliated with OpenAI, Anthropic, Google or xAI?", "No. SI Rumors is independent and not affiliated with or endorsed by any company it covers."],
  ["I found a mistake. How do I report it?", "Use the contact page and include a link to the correct information. We fix errors quickly."],
];

export default function FaqPage() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: QA.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return (
    <Prose kicker="FAQ" title="Frequently asked questions" intro="How SI Rumors works, in plain words.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="card divide-y divide-line">
        {QA.map(([q, a]) => (
          <details key={q} className="group p-4" open={q === "What is SI Rumors?"}>
            <summary className="cursor-pointer list-none text-base font-bold text-text marker:hidden">{q}</summary>
            <p className="mt-2">{a}</p>
          </details>
        ))}
      </div>
      <p>Still have a question? <Link href="/contact/">Contact us</Link>.</p>
    </Prose>
  );
}
