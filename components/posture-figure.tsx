import { UPRIGHT, type Posture } from '@/lib/signals';
import type { FigureId } from '@/lib/store';
import { CastFrame } from './cast';

// Rotation limits for the rendered figure, matched to what still reads as a human posture.
export const TORSO_MAX_DEG = 20;
export const HEAD_MAX_DEG = 24;
export const SIDE_MAX_DEG = 14;
export const TILT_MAX_DEG = 24;

/** Side view: the cast's side frames round the back and push the head forward together, so the larger of the two leads. */
export default function PostureFigure({ posture, who = 'raka', className = '' }: { posture: Posture | null; who?: FigureId; className?: string }) {
  const p = posture ?? UPRIGHT;
  const alt = `Dari samping: punggung bungkuk ${Math.round(p.torso * TORSO_MAX_DEG)}° dan kepala ${Math.round(p.head * HEAD_MAX_DEG)}° ke depan`;
  return <CastFrame who={who} view="side" amount={Math.max(p.torso, p.head)} alt={alt} className={className} eager />;
}

/** Front view, as the webcam sees you but mirrored: the body lean and the head tilt share one dial, whichever is larger. */
export function FrontFigure({ posture, who = 'raka', className = '' }: { posture: Posture | null; who?: FigureId; className?: string }) {
  const p = posture ?? UPRIGHT;
  const lean = Math.abs(p.tilt) > Math.abs(p.side) ? p.tilt : p.side;
  const alt = `Dari depan: badan miring ${Math.abs(Math.round(p.side * SIDE_MAX_DEG))}° dan kepala miring ${Math.abs(Math.round(p.tilt * TILT_MAX_DEG))}°`;
  return <CastFrame who={who} view="front" amount={lean} alt={alt} className={className} eager />;
}
