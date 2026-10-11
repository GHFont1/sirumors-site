import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "SI Rumors: superintelligence news, before it's news";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b0d12", color: "#eef0f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="120" height="120" viewBox="0 0 64 64">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6d4bff" /><stop offset="1" stopColor="#00c2b2" /></linearGradient></defs>
            <path d="M16 3h32a13 13 0 0 1 13 13v24a13 13 0 0 1-13 13H24l-11.5 8.6c-1.3 1-3.1 0-2.9-1.6L10.6 53A13 13 0 0 1 3 40V16A13 13 0 0 1 16 3z" fill="url(#g)" />
            <path d="M32.5 18.5c-2.6-3-13.4-3.6-14.3 2.6-1 6.7 15.3 5.7 15.3 12.8 0 6.6-12.4 7.5-16.3 3.1" fill="none" stroke="#fff" strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M42.5 17.5v22" stroke="#fff" strokeWidth="5.6" strokeLinecap="round" />
            <path d="M51.5 9.5l1.3 3.6 3.6 1.3-3.6 1.3-1.3 3.6-1.3-3.6-3.6-1.3 3.6-1.3z" fill="#fff" />
          </svg>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -3 }}>
            <span style={{ color: "#8b75ff" }}>SI</span><span>Rumors</span>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }}>Superintelligence news, before it&apos;s news.</div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#9aa1b2" }}>Every lab. Every leak. Every launch. Rumors rated, releases charted.</div>
      </div>
    ),
    size,
  );
}
