import type { Metadata } from "next";
import Link from "next/link";
import { NOW, meta } from "@/lib/data";
import { TimeAgo } from "@/components/TimeAgo";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = {
  title: "About SI Rumors",
  description: "What SI Rumors is, what we cover, how we decide what is news, how rumors are rated and how we write every story.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <Prose kicker="About" title="The go-to spot for the road to superintelligence" intro="SI Rumors tracks every frontier AI lab, the people running them and the things they build, from models and coding agents to humanoid robots and robotaxis. SI stands for superintelligence.">
      <h2>What we cover</h2>
      <p>Model and product releases from OpenAI, Anthropic, Google, xAI, Meta and the rest of the frontier labs; the creative AI companies (Suno, Runway, ElevenLabs, Midjourney and others); open-source projects like OpenClaw, Hermes and Ollama; usage-limit resets at every lab; the best frontier models ranked; the odds on what happens next; and the rumors and leaks that come before all of it.</p>
      <p>Everything updates every 30 minutes. Last update: <TimeAgo iso={meta.lastUpdated ?? new Date(NOW).toISOString()} built={NOW} />.</p>

      <h2>Only what matters</h2>
      <p>A story makes SI Rumors when a company announces something itself, when major news outlets carry it, when it is a big government move, or when it is a rumor with real backing. Commentary, hot takes, minor posts and filler stay off. Lab leaders&apos; posts count only when they announce a product or model.</p>

      <h2>How we write</h2>
      <p>Every story has its own page here, written in our own words. Each one is researched across the company&apos;s own announcement and the best available reporting, and written up with the help of AI tools under strict rules: only facts the research supports, nothing invented, no copying, and anything the company has not confirmed is clearly marked as unconfirmed.</p>

      <h2>Rumors are rated, not presented as fact</h2>
      <p>Leaks get a confidence score based on how many independent, credible outlets report them and their track record. A rumor flips to Confirmed when the company makes it official. The score measures how widely and credibly something is reported, not whether it is true. See the <Link href="/faq/">FAQ</Link> for how scores, release estimates, resets and the rankings work.</p>

      <h2>Independent</h2>
      <p>SI Rumors is independent. We are not affiliated with, endorsed by or paid by any AI company. Company names and logos belong to their owners and are used only to identify them.</p>

      <h2>Corrections</h2>
      <p>If we get something wrong, we fix it. Tell us through the <Link href="/contact/">contact page</Link> and include a link to the correct information.</p>

      <h2>Get the news first</h2>
      <p>Sign up for the daily digest from any page, or <Link href="/account/">create an account</Link> to follow companies and people, get instant reset and release alerts, and join the <Link href="/forums/">forums</Link>.</p>
    </Prose>
  );
}
