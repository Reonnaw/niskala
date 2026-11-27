'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import story from '@/lib/story.json';
import { Stars } from './ambient';
import { CastPicker, type CastId } from './cast';
import { IconArrowRight } from './icons';

// One beat per signal. assets/story/story.blend animates Raka and Ayu through them in this order,
// and lib/story.json holds the frame range of each beat.
const BEATS = [
  {
    hue: 'hue-kunyit',
    title: 'Bungkuk ke depan',
    how: 'Kamera depan ngukur tinggi, ukuran, dan anggukan wajahmu. Kamera samping langsung ngukur sudut leher dan punggung. Semuanya dibandingin sama posisi tegakmu waktu kalibrasi 4 detik.',
    answer: 'Pinggir layar nyala kuning, tapi baru kalau posisi itu bertahan sekitar sepuluh detik.',
  },
  {
    hue: 'hue-ungu',
    title: 'Miring ke samping',
    how: 'Wajah geser ke kiri atau kanan, atau garis matamu miring. Noleh ke monitor kedua nggak dihitung miring.',
    answer: 'Pinggir layar nyala juga, dan kamu dikasih tahu arahnya: badan miring ke kanan, atau kepala miring ke kiri.',
  },
  {
    hue: 'hue-daun',
    title: 'Kedipan',
    how: 'Normalnya 15 sampai 20 kali per menit. Pas natap layar, bisa anjlok jauh.',
    answer: 'Kalau kelamaan di bawah sepuluh per menit, pinggir layar nyala, plus ada istirahat mata 20 detik.',
  },
  {
    hue: 'hue-kunyit',
    title: 'Lama di depan layar',
    how: 'Dihitung selama halaman ini atau jendela kecilnya kelihatan. Tanpa kamera juga jalan.',
    answer: 'Istirahat mata 20-20-20 dan stretching 60 detik, sesuai jadwalmu.',
  },
  {
    hue: 'hue-mengkudu',
    title: 'Pas kamu pergi',
    how: 'Kamera lihat kursimu kosong lebih dari semenit.',
    answer: 'Waktu itu dihitung jeda, bukan waktu layar. Jadwal pengingatnya ikut nyesuain.',
  },
  {
    hue: 'hue-ungu',
    title: 'Jam malam',
    how: 'Jam tidurmu, cukup diatur sekali.',
    answer: 'Dua jam sebelumnya layar mulai hangat, dan kamu diingetin buat mulai beres-beres.',
  },
];

// Both characters share one rig, so they act out the same frame ranges.
const frameSrc = (who: CastId, i: number) => `/story/${who}/${String(i).padStart(3, '0')}.webp`;
const within = (f: number, ranges: number[][]) => ranges.some(([a, b]) => f >= a && f <= b);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
// Every second frame of the 24 fps scene is rendered, so 12 a second plays it at its own speed.
const FPS = 12;

export default function Story() {
  const skyRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nightRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [who, setWho] = useState<CastId>('raka');
  const cache = useRef<Partial<Record<CastId, HTMLImageElement[]>>>({});
  const requested = useRef(new Set<CastId>());
  // Frames keep arriving after a switch or a re-run of the effect; they always repaint whatever is current.
  const painter = useRef<() => void>(null);

  useEffect(() => {
    // Held for the effect's lifetime: leaving the page detaches the refs before this cleanup runs, and the
    // navigation's own scroll can still fire a frame in between.
    const sky = skyRef.current!;
    const text = textRef.current!;
    const stage = stageRef.current!;
    const nightLayer = nightRef.current!;
    const glow = glowRef.current!;
    const cue = cueRef.current!;
    const ctx = canvasRef.current!.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = matchMedia('(min-width: 1024px)');
    const loaded = (cache.current[who] ??= []);
    let want = 0;
    let shown = -1;
    let onScreen = false;
    let current = -1;
    let raf = 0;
    let play = 0;

    const paint = () => {
      let i = -1;
      for (let d = 0; d < story.frames && i < 0; d++) i = loaded[want - d] ? want - d : loaded[want + d] ? want + d : -1;
      if (i < 0 || i === shown) return;
      shown = i;
      ctx.clearRect(0, 0, story.width, story.height);
      ctx.drawImage(loaded[i], 0, 0);
    };
    painter.current = paint;

    const show = (f: number) => {
      want = f;
      const night = clamp((f - story.night[0]) / (story.night[1] - story.night[0]));
      nightLayer.style.opacity = String(night);
      sky.style.setProperty('--night', String(night));
      // Light text only once the sky is past dusk; the rose half of the sunset still carries dark text.
      sky.toggleAttribute('data-night', night >= 0.6);
      glow.style.opacity = onScreen && within(f, story.glow) ? '0.8' : '0';
      cue.style.opacity = onScreen && within(f, story.cue) ? '0.8' : '0';
      paint();
    };

    // Each beat plays once from its first frame to its last when it becomes the one being read.
    const playBeat = (b: number) => {
      cancelAnimationFrame(play);
      const [s, e] = story.beats[b];
      if (reduce) return show(e);
      const t0 = performance.now();
      const tick = (t: number) => {
        const f = Math.min(e, s + Math.floor(((t - t0) / 1000) * FPS));
        show(f);
        if (f < e) play = requestAnimationFrame(tick);
      };
      play = requestAnimationFrame(tick);
    };

    const update = () => {
      raf = 0;
      // On phones the stage is pinned above the text, so the reading line sits in the space left under it.
      const top = wide.matches ? 0 : stage.getBoundingClientRect().bottom;
      const r = text.getBoundingClientRect();
      const p = clamp(((top + innerHeight) / 2 - r.top) / r.height) * BEATS.length;
      const b = Math.min(BEATS.length - 1, Math.floor(p));
      onScreen = r.top < innerHeight && r.bottom > 0;
      setBeat(b);
      // Off screen nothing plays, and coming back replays the beat in view. Once scrolled past, it stays night,
      // so the sky still meets the nila band below after a jump down the page.
      if (!onScreen) {
        current = -1;
        if (r.bottom <= 0) want = story.frames - 1;
      }
      else if (b !== current) {
        current = b;
        playBeat(b);
      }
      show(want);
    };
    const schedule = () => (raf ||= requestAnimationFrame(update));

    // Coarse frames first, then the gaps, so a beat that starts before everything has loaded still has something close to show.
    const load = () => {
      if (requested.current.has(who)) return;
      requested.current.add(who);
      const order = reduce ? story.beats.map(([, e]) => e) : [];
      for (let step = 16; !reduce && step >= 1; step /= 2)
        for (let i = 0; i < story.frames; i += step) if (!order.includes(i)) order.push(i);
      for (const i of order) {
        const img = new window.Image();
        img.onload = () => {
          loaded[i] = img;
          painter.current?.();
        };
        img.src = frameSrc(who, i);
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        load();
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(stage);

    update();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(play);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    };
  }, [who]);

  return (
    <section ref={skyRef} id="cara-kerja" className="sky relative">
      {/* Stars come out with the room's night, over the last beat and the space below it. */}
      <Stars className="bottom-0 h-[150svh] transition-opacity duration-[1.2s]" style={{ opacity: 'var(--night, 0)' }} />
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-10 sm:px-8 sm:pt-28">
        <h2 className="max-w-2xl text-3xl sm:text-[2.6rem] sm:leading-tight">Sehari bareng Niskala, dari pagi sampai jam tidur.</h2>
        <div className="relative lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
          <div aria-hidden ref={glowRef} className="edge-glow" />
          <div aria-hidden ref={cueRef} className="edge-cue" />

          <div className="sky-fill sticky top-16 z-10 -mx-4 px-4 py-3 sm:-mx-8 sm:px-8 lg:order-2 lg:mx-0 lg:flex lg:h-[calc(100svh-4rem)] lg:items-center lg:self-start lg:bg-transparent lg:p-0">
            {/* The room floats on the sky like the hero's diorama, so there is no frame around it. On phones it stays small
                enough to leave room for the text under it. */}
            <div className="relative mx-auto w-full max-w-[44svh] lg:max-w-none">
              <div ref={stageRef} aria-hidden className="relative aspect-square w-full">
                <Image src="/story/day.webp" alt="" fill unoptimized className="object-contain" />
                <div ref={nightRef} className="absolute inset-0 opacity-0">
                  <Image src="/story/night.webp" alt="" fill unoptimized className="object-contain" />
                </div>
                <canvas ref={canvasRef} width={story.width} height={story.height} className="absolute inset-0 size-full" />
              </div>
              <div className="absolute bottom-[4%] left-[2%] rounded-full bg-raised p-1.5 shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)]">
                <CastPicker value={who} onChange={setWho} size="size-10" label="Siapa yang main" />
              </div>
            </div>
          </div>

          <div ref={textRef} className="lg:order-1">
            {BEATS.map((b, i) => (
              <article
                key={b.title}
                className={`${b.hue} flex min-h-[75svh] flex-col justify-center py-10 transition-opacity duration-500 lg:min-h-[80svh] ${i === beat ? '' : 'opacity-35'}`}
              >
                <h3 className="flex items-center gap-3 text-2xl sm:text-3xl">
                  <span className="size-3 shrink-0 rounded-full bg-hue" aria-hidden />
                  {b.title}
                </h3>
                <p className="mt-3 text-lg text-sky-muted text-pretty">{b.how}</p>
                <p className="mt-4 flex gap-2 text-lg text-pretty">
                  <IconArrowRight className="mt-1.5 size-4 shrink-0 text-sky-mark" />
                  {b.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
