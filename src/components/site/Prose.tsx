// Shared layout for About, FAQ, Terms and Privacy: a readable single column.
export function Prose({ kicker, title, intro, updated, children }: { kicker: string; title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl">
      <div className="kicker">{kicker}</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
      {updated && <p className="mt-2 text-sm text-faint">Last updated {updated}</p>}
      <div className="prose-si mt-8 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-accent [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text">{children}</div>
    </article>
  );
}
