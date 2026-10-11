import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">Still just a rumor.</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist yet.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-accent hover:underline">Back to SI Rumors →</Link>
    </div>
  );
}
