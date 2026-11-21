'use client';

import Image from 'next/image';
import { useEffect, useEffectEvent, useState } from 'react';
import { sideWord } from '@/lib/format';
import { ROUTINES, type Exercise, type RoutineKind as Kind } from '@/lib/routines';
import { dominant, driftOf, type Posture } from '@/lib/signals';
import type { FigureId } from '@/lib/store';
import { hush, speak, stepIntro } from '@/lib/voice';
import { IconCamera, IconCheck, IconNext, IconPause, IconPlay } from './icons';
import { HEAD_MAX_DEG, TILT_MAX_DEG } from './posture-figure';
import { ProgressRing } from './ui';

const clip = (who: FigureId, e: Exercise) => `/exercise/${who}/${e}.webp`;

/** Seconds spent upright, out of the seconds the camera could see you, across the steps that check it. */
export type Upright = { held: number; measured: number };

export default function RoutineRunner({ kind, who, posture, threshold, blinkTotal, voice, onDone, onExit, compact = false }: {
  kind: Kind;
  who: FigureId;
  posture: Posture | null;
  /** The drift that counts as leaning; "upright" is under half of it, like the state pill. */
  threshold: number;
  blinkTotal: number | null;
  voice: boolean;
  onDone: (upright: Upright) => void;
  onExit: () => void;
  compact?: boolean;
}) {
  const { title, steps } = ROUTINES[kind];
  const starts = steps.map((_, i) => steps.slice(0, i).reduce((a, s) => a + s.seconds, 0));
  const total = steps.reduce((a, s) => a + s.seconds, 0);

  const [t, setT] = useState(0);
  const [running, setRunning] = useState(true);
  const [stepBlinks, setStepBlinks] = useState<{ index: number; start: number | null }>({ index: 0, start: blinkTotal });
  const [upright, setUpright] = useState<Upright>({ held: 0, measured: 0 });

  const index = Math.max(0, starts.findLastIndex((s) => t >= s));
  const step = steps[index];
  const inStep = t - starts[index];
  const cue = step.cues[Math.min(step.cues.length - 1, Math.floor(inStep / (step.seconds / step.cues.length)))];

  const goTo = (next: number) => {
    if (t >= total) return;
    next = Math.min(total, next);
    const nextIndex = Math.max(0, starts.findLastIndex((s) => next >= s));
    if (nextIndex !== stepBlinks.index) setStepBlinks({ index: nextIndex, start: blinkTotal });
    setT(next);
    if (next >= total) onDone(upright);
  };
  const isUpright = posture !== null && driftOf(posture) < threshold * 0.45;
  const advance = useEffectEvent((dt: number) => {
    if (step.check === 'upright' && posture) setUpright((u) => ({ held: u.held + (isUpright ? dt : 0), measured: u.measured + dt }));
    goTo(t + dt);
  });

  // A new step announces its name; after that only the cue changes are read out.
  const announce = useEffectEvent(() => speak(inStep < 1 ? stepIntro(step) : cue));
  useEffect(() => {
    if (!voice) return;
    if (running) announce();
    else hush();
  }, [voice, running, index, cue]);

  // Every move of the routine loads up front, so a new step shows its clip at once.
  useEffect(() => {
    for (const s of steps) new window.Image().src = clip(who, s.visual);
  }, [steps, who]);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      advance((now - last) / 1000);
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  let feedback: string | null = null;
  if (step.check === 'head' && posture) {
    const deg = Math.round(posture.head * HEAD_MAX_DEG);
    feedback = deg <= 3 ? 'Kepala udah sejajar bahu.' : `Kepala masih ${deg}° ke depan. Tarik dikit lagi.`;
  } else if (step.check === 'tilt' && posture) {
    const deg = Math.round(posture.tilt * TILT_MAX_DEG);
    feedback = Math.abs(deg) < 4 ? 'Kepala masih tegak. Biarin miring pelan-pelan.' : `Kepala miring ${Math.abs(deg)}° ke ${sideWord(deg)}.`;
  } else if (step.check === 'upright' && posture) {
    const d = dominant(posture);
    const held = `${Math.round(upright.held)} dtk tegak sejauh ini.`;
    feedback = isUpright
      ? `Pas, tegak. ${held}`
      : d.kind === 'forward'
        ? `Masih bungkuk. Tegakin punggung, bahu turun. ${held}`
        : `${d.kind === 'side' ? 'Badan' : 'Kepala'} miring ke ${d.dir}. Balik ke tengah. ${held}`;
  } else if (step.check === 'blinks' && blinkTotal !== null && stepBlinks.start !== null) {
    feedback = `${blinkTotal - stepBlinks.start} kedipan kehitung.`;
  }

  return (
    <div className={compact ? 'space-y-3' : 'card space-y-5 p-5 sm:p-6'} aria-label={title}>
      <div className={compact ? 'flex items-center gap-3' : 'flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6'}>
        <Image
          src={clip(who, step.visual)}
          alt={`Contoh gerakan: ${step.title}`}
          width={360}
          height={360}
          unoptimized
          className={`shrink-0 rounded-2xl bg-surface ${compact ? 'size-20' : 'mx-auto size-48 sm:mx-0 sm:size-44'}`}
        />
        <div className="flex items-center gap-4 sm:gap-6">
          <ProgressRing value={t / total} size={compact ? 76 : 112}>
            <p className={`${compact ? 'text-base' : 'text-2xl'} leading-none font-bold tabular-nums`}>
              {Math.ceil(total - t)}
              <span className="text-[0.6em] font-semibold text-muted"> dtk</span>
            </p>
          </ProgressRing>
          <div className="min-w-0" aria-live="polite">
            <p className={`${compact ? 'text-lg' : 'text-2xl sm:text-3xl'} leading-tight font-bold tracking-tight text-balance`}>{cue}</p>
            {!compact && <p className="mt-2 text-muted text-pretty">{step.how}</p>}
          </div>
        </div>
      </div>

      {steps.length > 1 && !compact && (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Langkah">
          {steps.map((s, i) => {
            const done = t >= starts[i] + s.seconds;
            const current = i === index && !done;
            return (
              <li
                key={s.title}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${
                  current ? 'border-accent bg-accent-soft font-semibold text-ink' : done ? 'border-rule text-muted' : 'border-rule text-muted'
                }`}
              >
                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? 'bg-accent text-on-accent' : 'bg-surface'}`}>
                  {done ? <IconCheck className="size-3" /> : i + 1}
                </span>
                <span className="leading-tight">{s.title}</span>
              </li>
            );
          })}
        </ol>
      )}

      {feedback && (
        <p className="flex items-center gap-2 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <IconCamera className="size-3.5" />
          </span>
          {feedback}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`btn ${compact ? 'btn-sm' : ''}`} onClick={() => setRunning((r) => !r)}>
          {running ? <IconPause className="size-4" /> : <IconPlay className="size-4" />}
          {running ? 'Jeda' : 'Lanjut'}
        </button>
        {steps.length > 1 && (
          <button type="button" className={`btn ${compact ? 'btn-sm' : ''}`} onClick={() => goTo(starts[index] + step.seconds)}>
            <IconNext className="size-4" />
            {index === steps.length - 1 ? 'Selesai' : 'Lanjut langkah'}
          </button>
        )}
        <button type="button" className={`btn btn-ghost ${compact ? 'btn-sm' : ''}`} onClick={onExit}>
          Stop
        </button>
      </div>
    </div>
  );
}
