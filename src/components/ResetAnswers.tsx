import { fmtDate } from "@/lib/format";
import { resetFacts, resetFaq, resetQA, resetToday } from "@/lib/resetSeo";
import { Section } from "./Blocks";

type Lab = "openai" | "anthropic";

/** The one-line answer at the top of a reset page: did it reset today, and when is the next one. */
export function ResetStatus({ lab = "openai", name }: { lab?: Lab; name: string }) {
  const { last, coming, nextGuess } = resetFacts(lab);
  if (!last) return null;
  const yes = resetToday(lab);
  return (
    <div className="card mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 p-4" style={{ borderColor: yes ? "var(--good)" : undefined }}>
      <span className="text-lg font-extrabold tracking-tight">{name} reset today? <span style={{ color: yes ? "var(--good)" : "var(--muted)" }}>{yes ? "Yes" : "No"}</span></span>
      <span className="text-sm text-muted">Last reset {fmtDate(last.date)}</span>
      {coming ? <span className="text-sm font-bold text-accent">Next reset announced for {fmtDate(coming.date)}</span>
        : nextGuess ? <span className="text-sm text-muted">Next likely around {fmtDate(nextGuess, false)} (estimate)</span> : null}
    </div>
  );
}

/** Quick answers with FAQ markup; the visible text and the markup are the same words. */
export function ResetQuestions({ lab = "openai", name }: { lab?: Lab; name: string }) {
  const qa = resetQA(lab);
  const ld = resetFaq(lab);
  if (!qa.length) return null;
  return (
    <Section title={`${name} reset questions`} kicker="Quick answers">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <div className="card divide-y divide-line">
        {qa.map(([q, a]) => (
          <div key={q} className="p-4"><h3 className="text-base font-bold text-text">{q}</h3><p className="mt-1 text-muted">{a}</p></div>
        ))}
      </div>
    </Section>
  );
}
