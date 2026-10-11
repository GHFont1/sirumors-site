import { NOW, type Video } from "@/lib/data";
import { compact, duration } from "@/lib/format";
import { TimeAgo } from "./TimeAgo";

export function VideoCard({ v }: { v: Video }) {
  return (
    <a href={v.url} target="_blank" rel="noopener noreferrer" className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-chip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        {v.duration ? <span className="tabular absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">{duration(v.duration)}</span> : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">{v.title}</h3>
      <p className="mt-0.5 text-xs text-muted">
        {v.channel}
        {v.views ? <> · {compact(v.views)} views</> : null} · <TimeAgo iso={v.publishedAt} built={NOW} />
      </p>
    </a>
  );
}

export function VideoGrid({ items, empty = "No videos yet." }: { items: Video[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-sm text-muted">{empty}</p>;
  return <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((v) => <VideoCard key={v.id} v={v} />)}</div>;
}
