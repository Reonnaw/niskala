const pad = (n: number) => String(n).padStart(2, '0');

export const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/** Minutes after midnight from an `<input type="time">` value, or null if incomplete. */
export function parseHhmm(v: string) {
  const [h, m] = v.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/** Precise duration for live status: "45 dtk", "3 mnt 05 dtk", "1 j 20 mnt". */
export function duration(s: number) {
  s = Math.floor(s);
  if (s < 60) return `${s} dtk`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt ${pad(s % 60)} dtk`;
  return `${Math.floor(s / 3600)} j ${pad(Math.floor(s / 60) % 60)} mnt`;
}

/** Coarse duration for summaries: "45 mnt", "3 j 20 mnt". */
export function minutes(s: number) {
  if (s < 60) return `${Math.floor(s)} dtk`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} j${m % 60 ? ` ${m % 60} mnt` : ''}`;
}

/** "kanan" / "kiri" for a signed sideways value, from the user's point of view. */
export const sideWord = (v: number): 'kanan' | 'kiri' => (v > 0 ? 'kanan' : 'kiri');
