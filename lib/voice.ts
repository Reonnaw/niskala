// Every line Niskala can say. Each one is recorded once with Gemini TTS (scripts/voice.ts) and
// served from /voice, so nothing is sent anywhere while the app runs and no key reaches the browser.
import { ROUTINES, type RoutineKind, type Step } from './routines.ts';
import { dominant, type Posture } from './signals.ts';

export const SAY = {
  head: 'Kepalamu maju ke arah layar. Tarik dagu dikit, telinga sejajar bahu.',
  back: 'Punggungmu mulai bungkuk. Duduk tegak lagi, bahu turun.',
  side: { kanan: 'Badanmu miring ke kanan. Balik ke tengah, ya.', kiri: 'Badanmu miring ke kiri. Balik ke tengah, ya.' },
  tilt: { kanan: 'Kepalamu miring ke kanan. Luruskan lagi pelan-pelan.', kiri: 'Kepalamu miring ke kiri. Luruskan lagi pelan-pelan.' },
  eyes: 'Kamu jarang ngedip. Kedip penuh beberapa kali, terus lihat jauh sebentar.',
  close: 'Kamu kedeketan ke layar. Mundur dikit, sekitar satu lengan.',
  due: {
    eye: 'Waktunya istirahat mata. Lihat yang jauh, sekitar enam meter, selama dua puluh detik.',
    reset: 'Waktunya stretching enam puluh detik. Leher, bahu, dan mata, dipandu satu-satu.',
  },
  done: {
    eye: 'Istirahat mata selesai. Lanjut kerja lagi.',
    reset: 'Stretching selesai. Badan udah lebih enteng.',
    train: 'Latihan postur selesai.',
    breath: 'Jeda napas selesai. Pelan-pelan balik kerja, ya.',
    great: 'Latihan selesai. Mantap, kamu tegak hampir sepanjang latihan.',
    fair: 'Latihan selesai. Lumayan, lebih dari separuh waktu kamu tegak.',
    low: 'Latihan selesai. Masih sering geser, coba lagi nanti pelan-pelan.',
  },
};

/** What to say when posture has drifted long enough to light the edge, naming the direction. */
export function postureLine(p: Posture) {
  const d = dominant(p);
  if (d.kind === 'side') return SAY.side[d.dir];
  if (d.kind === 'tilt') return SAY.tilt[d.dir];
  return p.head > p.torso ? SAY.head : SAY.back;
}

/** A step opens with its name and first cue, said once when one already begins with the other. */
export function stepIntro(s: Step) {
  const [title, cue] = [s.title, s.cues[0]];
  return cue.startsWith(title) ? cue : title.startsWith(cue) ? title : `${title}. ${cue}`;
}

/** Closing line of a routine; training is judged by the share of seen time spent upright. */
export function doneLine(kind: RoutineKind, upright: { held: number; measured: number }) {
  if (kind !== 'train') return SAY.done[kind];
  if (upright.measured < 10) return SAY.done.train;
  const share = upright.held / upright.measured;
  return share >= 0.8 ? SAY.done.great : share >= 0.5 ? SAY.done.fair : SAY.done.low;
}

export function allLines() {
  const lines = new Set<string>();
  const walk = (v: string | object) => (typeof v === 'string' ? lines.add(v) : Object.values(v).forEach(walk));
  walk(SAY);
  for (const r of Object.values(ROUTINES))
    for (const s of r.steps) {
      lines.add(stepIntro(s));
      s.cues.forEach((c) => lines.add(c));
    }
  return [...lines];
}

// FNV-1a: a short stable file name per line, so editing a line asks for a new recording.
export function clipOf(text: string) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return `/voice/${h.toString(16).padStart(8, '0')}.mp3`;
}

let playing: HTMLAudioElement | null = null;

/** Stops the line that is playing, for a routine stopped or paused halfway. */
export function hush() {
  playing?.pause();
  playing = null;
}

/** Plays the recording of a line; a newer line cuts off one still playing, so reminders never queue up. */
export function speak(text: string) {
  try {
    playing?.pause();
    playing = new Audio(clipOf(text));
    playing.play().catch(() => {});
  } catch {}
}
