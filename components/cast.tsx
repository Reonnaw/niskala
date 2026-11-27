'use client';

import Image from 'next/image';
import { useEffect, useSyncExternalStore } from 'react';

// The two Tripo characters from assets/story/story.blend. Each has 17 side frames (upright to fully
// slouched) and 17 front frames (leaning left to right, mirrored like a webcam), from assets/story/hero.py.
export const CAST = [
  { id: 'raka', name: 'Raka', hue: 'hue-nila' },
  { id: 'ayu', name: 'Ayu', hue: 'hue-daun' },
] as const;
export type CastId = (typeof CAST)[number]['id'];

const LAST = 16;
const src = (who: CastId, view: 'side' | 'front', i: number) => `/cast/${who}/${view}-${String(i).padStart(2, '0')}.webp`;
const SIZE = { side: [1000, 1000], front: [640, 760] } as const;
const REDUCE = '(prefers-reduced-motion: reduce)';
const onMotionChange = (cb: () => void) => {
  const m = matchMedia(REDUCE);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};

/** amount: 0..1 of slouch for the side view, -1..1 of lean for the front view. */
export function CastFrame({ who, view, amount, alt, className = '', eager = false }: { who: CastId; view: 'side' | 'front'; amount: number; alt: string; className?: string; eager?: boolean }) {
  const t = view === 'side' ? amount : (amount + 1) / 2;
  const i = Math.round(Math.min(1, Math.max(0, t)) * LAST);

  // Sitting upright from the side, the figure breathes and reads instead of standing still; the frames take over once it leans.
  const still = useSyncExternalStore(onMotionChange, () => matchMedia(REDUCE).matches, () => true);
  const idle = view === 'side' && i === 0 && !still;

  // Warm the cache after first paint, so a slider drag swaps between already loaded frames.
  useEffect(() => {
    const id = setTimeout(() => {
      for (let k = 0; k <= LAST; k++) new window.Image().src = src(who, view, k);
    }, 400);
    return () => clearTimeout(id);
  }, [who, view]);

  const [w, h] = SIZE[view];
  return (
    <Image
      src={idle ? `/cast/${who}/side-idle.webp` : src(who, view, i)}
      alt={alt}
      width={w}
      height={h}
      unoptimized
      loading={eager ? 'eager' : 'lazy'}
      className={`h-full w-full object-contain ${className}`}
    />
  );
}

/** Native radios with each character's face, so arrow keys move between them. */
export function CastPicker({ value, onChange, size = 'size-11', label = 'Figur' }: { value: CastId; onChange: (id: CastId) => void; size?: string; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {CAST.map((c) => (
        <label
          key={c.id}
          title={c.name}
          className={`${c.hue} ${size} relative cursor-pointer overflow-hidden rounded-full bg-hue-soft ring-2 ring-transparent ring-offset-2 ring-offset-raised transition-shadow hover:ring-hue/40 has-checked:ring-hue has-focus-visible:outline-2 has-focus-visible:outline-accent`}
        >
          <input type="radio" name={label} className="sr-only" checked={value === c.id} onChange={() => onChange(c.id)} aria-label={c.name} />
          <Image src={`/cast/${c.id}/face.webp`} alt="" width={240} height={240} unoptimized className="h-full w-full object-cover" />
        </label>
      ))}
    </div>
  );
}
