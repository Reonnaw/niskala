'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import { sideWord } from '@/lib/format';
import { UPRIGHT } from '@/lib/signals';
import { Drift } from './ambient';
import { CAST, CastFrame, CastPicker, type CastId } from './cast';
import { IconArrowRight, IconPosture } from './icons';
import { HEAD_MAX_DEG, SIDE_MAX_DEG, TORSO_MAX_DEG } from './posture-figure';

const THRESHOLD = 45;
// Shorter than the workspace's ~10 s so the effect shows up while someone is reading the page.
const HOLD_MS = 1500;
// Until someone touches a control the two characters act it out themselves, one cycle each:
// lean in, hold long enough for the edge to light, straighten, rest.
const CYCLE_MS = 8000;
const ease = (x: number) => 1 - (1 - x) ** 3;
function autoAmount(p: number) {
  if (p < 2200) return ease(p / 2200);
  if (p < 5200) return 1;
  if (p < 6400) return 1 - ease((p - 5200) / 1200);
  return 0;
}

export default function Hero() {
  const [slouch, setSlouch] = useState(0);
  const [lean, setLean] = useState(0);
  const [glow, setGlow] = useState(false);
  const [who, setWho] = useState<CastId>('raka');
  const [auto, setAuto] = useState(true);
  // The edge glow is fixed to the viewport; once the hero scrolls away the story below owns it.
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const off = Math.max(slouch, Math.abs(lean)) >= THRESHOLD;

  const pose = (s: number, l: number) => {
    setSlouch(s);
    setLean(l);
    if (Math.max(s, Math.abs(l)) < THRESHOLD) setGlow(false);
  };

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(sectionRef.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!off) return;
    const id = setTimeout(() => setGlow(true), HOLD_MS);
    return () => clearTimeout(id);
  }, [off]);

  // Returns false after four cycles: Raka slouches, Ayu leans left, Raka leans right, Ayu slouches.
  const play = useEffectEvent((t: number) => {
    const cycle = Math.floor(t / CYCLE_MS);
    if (cycle >= 4) return false;
    const a = Math.round(autoAmount(t % CYCLE_MS) * 72);
    setWho(CAST[cycle % 2].id);
    if (cycle % 3 === 0) pose(a, 0);
    else pose(0, cycle === 1 ? -a : a);
    return true;
  });

  // It acts it out while in view, so it still has something to show when someone scrolls down to it.
  useEffect(() => {
    if (!auto || !inView || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const id = setInterval(() => play(performance.now() - start) || clearInterval(id), 50);
    return () => clearInterval(id);
  }, [auto, inView]);

  const posture = {
    ...UPRIGHT,
    torso: slouch / 100,
    head: Math.min(1, (slouch / 100) * 1.15),
    side: lean / 100,
    tilt: (lean / 100) * 0.6,
  };
  const torsoDeg = Math.round(posture.torso * TORSO_MAX_DEG);
  const headDeg = Math.round(posture.head * HEAD_MAX_DEG);
  const sideDeg = Math.abs(Math.round(posture.side * SIDE_MAX_DEG));
  const take = () => setAuto(false);

  return (
    <section ref={sectionRef} className="relative mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-4 pt-14 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-y-12 lg:pt-12">
      <div aria-hidden className="edge-glow" style={{ opacity: glow && inView ? (auto ? 0.6 : 0.8) : 0 }} />
      <Drift
        spots={[
          { top: '4%', left: '-3%', size: '26rem', turn: 150, float: 17 },
          { top: '62%', left: '38%', size: '11rem', turn: 110, float: 13 },
          { top: '-6%', right: '-4%', size: '18rem', turn: 170, float: 21 },
        ]}
      />

      <h2 className="text-[2.6rem] leading-[1.05] font-extrabold sm:text-6xl lg:col-start-1 lg:row-start-2 lg:text-[3.7rem]">
        Coba bikin dia{' '}
        <span className="marker" style={{ '--mark': `${30 + Math.max(slouch, Math.abs(lean)) * 0.7}%` } as CSSProperties}>
          bungkuk.
        </span>
      </h2>

      <figure className="relative isolate mt-24 min-w-0 lg:col-start-2 lg:row-span-4 lg:self-center">
        {/* Morning light behind the stage: the page starts at daybreak and the story below ends at night. */}
        <div aria-hidden className="absolute -inset-x-24 -inset-y-28 -z-10 bg-[radial-gradient(closest-side_at_62%_38%,color-mix(in_oklab,var(--kunyit)_38%,transparent),transparent)]" />
        {/* The stage stands in for a screen: the webcam clips onto its top edge and says the one thing people worry about. */}
        <div className="absolute bottom-[calc(100%-2.25rem)] left-1/2 z-10 flex w-64 -translate-x-1/2 flex-col items-center sm:bottom-[calc(100%-2.75rem)]">
          <p className="relative rounded-2xl border border-rule bg-raised px-3.5 py-2 text-center leading-snug font-semibold text-balance shadow-[0_8px_20px_-10px_var(--shadow)]">
            Tenang, videomu nggak keluar dari browser.
            <span aria-hidden className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b border-rule bg-raised" />
          </p>
          <Image src="/3d/webcam.webp" alt="" width={460} height={388} unoptimized className="mt-2 h-auto w-20 drop-shadow-md sm:w-24" />
        </div>
        <Image src="/3d/plant.webp" alt="" width={210} height={460} unoptimized className="absolute -bottom-3 -left-9 z-10 hidden h-auto w-16 drop-shadow-lg lg:block xl:w-[4.5rem]" />
        <div className="stage card relative overflow-hidden">
          <div className="mx-auto aspect-square max-h-[64vh] w-full">
            <CastFrame
              who={who}
              view="side"
              amount={slouch / 100}
              alt={`Dari samping: punggung bungkuk ${torsoDeg}° dan kepala ${headDeg}° ke depan`}
            />
          </div>
          <div className="card absolute top-3 right-3 w-[30%] p-1.5">
            <div className="aspect-[640/760] overflow-hidden rounded-xl bg-surface">
              <CastFrame who={who} view="front" amount={lean / 100} alt={lean === 0 ? 'Dari depan: tegak' : `Dari depan: miring ${sideDeg}° ke ${sideWord(lean)}`} />
            </div>
          </div>
          <p className="float-card absolute right-3 bottom-3 flex items-center gap-2 py-2 font-semibold xl:hidden" aria-live={auto ? 'off' : 'polite'}>
            <span className={`size-2.5 rounded-full ${glow ? 'bg-alert' : 'bg-edge'}`} />
            Pinggir layar
            <span className={`ml-1 font-extrabold ${glow ? 'text-alert-ink' : 'text-muted'}`}>{glow ? 'nyala' : off ? 'bentar lagi' : 'mati'}</span>
          </p>
        </div>

        <div className="float-card absolute top-[40%] -left-10 hidden w-48 xl:block" aria-hidden>
          <p className="flex items-center gap-2 font-semibold">
            <IconPosture className="size-4 text-accent" />
            Punggung
            <span className="ml-auto text-lg font-extrabold tabular-nums">{torsoDeg}°</span>
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-rule">
            <div
              className={`h-full origin-left rounded-full transition-transform duration-300 ${slouch >= THRESHOLD ? 'bg-alert' : 'bg-accent'}`}
              style={{ transform: `scaleX(${Math.max(0.03, slouch / 100)})` }}
            />
          </div>
        </div>
        <p className="float-card absolute -right-6 bottom-[22%] hidden items-center gap-2 font-semibold xl:flex" aria-live={auto ? 'off' : 'polite'}>
          <span className={`size-2.5 rounded-full ${glow ? 'bg-alert' : 'bg-edge'}`} />
          Pinggir layar
          <span className={`ml-2 font-extrabold ${glow ? 'text-alert-ink' : 'text-muted'}`}>{glow ? 'nyala' : off ? 'bentar lagi' : 'mati'}</span>
        </p>
      </figure>

      {/* The controls read as sentences at near-heading size, so there is no small print under the headline. */}
      <div className="lg:col-start-1 lg:row-start-3" onPointerDown={take} onKeyDown={take}>
        <div className="space-y-5 text-xl font-bold tracking-tight sm:text-2xl">
          <label className="flex items-center gap-5">
            <span className="w-32 shrink-0 sm:w-40">Bungkukin</span>
            <input
              type="range"
              min={0}
              max={100}
              value={slouch}
              onChange={(e) => pose(Number(e.target.value), lean)}
              aria-valuetext={`punggung ${torsoDeg}°, kepala ${headDeg}°`}
              className="range range-lg"
            />
          </label>
          <label className="flex items-center gap-5">
            <span className="w-32 shrink-0 sm:w-40">Miringin</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={lean}
              onChange={(e) => pose(slouch, Number(e.target.value))}
              aria-valuetext={lean === 0 ? 'tegak' : `${sideDeg}° ke ${sideWord(lean)}`}
              className="range range-lg"
            />
          </label>
          <div className="flex items-center gap-5">
            <span className="w-32 shrink-0 sm:w-40">Ganti orang</span>
            <CastPicker
              value={who}
              onChange={(id) => {
                take();
                setWho(id);
              }}
            />
          </div>
        </div>
        <Link href="/app" className="btn btn-primary btn-lg mt-10">
          Coba pakai webcam-mu
          <IconArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
