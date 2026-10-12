import type { Metadata } from "next";
import { rumorUpdates } from "@/lib/updates";
import { UpdatesStream } from "@/components/Updates";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AI Rumors and Leaks, Rated by Confidence",
  description: "The AI leaks and rumors that matter, each rated by how widely and credibly it is reported, and marked confirmed when the lab makes it official.",
  alternates: { canonical: "/rumors/" },
};

// Same clean layout as the home page: a short header, one badge list, the sidebar.
export default function RumorsPage() {
  const items = rumorUpdates(14);
  return (
    <>
      <section className="pt-2">
        <div className="kicker">Rumors</div>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">AI rumors and leaks</h1>
        <p className="mt-2 max-w-xl text-muted">What the labs haven&apos;t announced yet, rated by how well it&apos;s backed. Last 14 days, newest first.</p>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <section>
          <UpdatesStream items={items} filters={false} />
          <p className="mt-4 text-xs text-faint">Whisper: one source. Rumor: several outlets. Strong rumor: wide, credible reporting. Confirmed: the lab made it official. The % is how well backed it is, not whether it&apos;s true.</p>
        </section>
        <Sidebar />
      </div>
    </>
  );
}
