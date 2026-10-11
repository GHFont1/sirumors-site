// SI Points ranks and badges. Points are awarded server-side (see
// supabase/migrations/*_points.sql); this file only names and styles them.

export type Rank = { min: number; name: string; flavor: string; color: string; glow?: boolean };

export const RANKS: Rank[] = [
  { min: 0, name: "Lurker", flavor: "Watching. Learning. Everyone starts here.", color: "#8a90a0" },
  { min: 100, name: "Insider", flavor: "You're in the room now.", color: "#3b82f6" },
  { min: 500, name: "Source", flavor: "People check what you post.", color: "#0d9488" },
  { min: 1500, name: "Leaker", flavor: "You hear things before the headlines do.", color: "#7c5cff" },
  { min: 5000, name: "Oracle", flavor: "Your calls tend to land.", color: "#d946ef" },
  { min: 15000, name: "Prophet", flavor: "The community waits for your take.", color: "#f59e0b" },
  { min: 50000, name: "Singularity", flavor: "Beyond the curve. The top of the board.", color: "#2fd6c6", glow: true },
];

export function rankFor(points: number) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (points >= RANKS[k].min) i = k;
  const next = RANKS[i + 1];
  return { rank: RANKS[i], next, progress: next ? (points - RANKS[i].min) / (next.min - RANKS[i].min) : 1 };
}

export const EARN = [
  { label: "Create your profile", pts: 100, repeat: "once" },
  { label: "Start a forum thread", pts: 100, repeat: "per thread" },
  { label: "Reply in a thread", pts: 25, repeat: "once per thread" },
  { label: "Your thread gets a reply", pts: 5, repeat: "per reply" },
  { label: "Your thread gets an upvote", pts: 10, repeat: "per upvote" },
  { label: "Daily check-in", pts: 10, repeat: "once a day" },
  { label: "7-day streak bonus", pts: 50, repeat: "every 7 days in a row" },
  { label: "Build your feed (follow 5 things)", pts: 50, repeat: "once" },
];

export const BADGES: Record<string, { label: string; icon: string; desc: string; soon?: boolean }> = {
  founding: { label: "Founding Member", icon: "✦", desc: "One of the first 1,000 accounts." },
  moderator: { label: "Moderator", icon: "🛡", desc: "Keeps the forums clean." },
  "called-it": { label: "Called It", icon: "🎯", desc: "Posted a rumor before it was confirmed." },
  supporter: { label: "Supporter", icon: "💜", desc: "Supports SI Rumors.", soon: true },
  "hf-pro": { label: "HF Pro", icon: "🤗", desc: "Verified Hugging Face PRO subscriber.", soon: true },
  builder: { label: "Builder", icon: "⌨", desc: "Verified GitHub developer.", soon: true },
  verified: { label: "Verified", icon: "✓", desc: "Identity verified by SI Rumors.", soon: true },
};
