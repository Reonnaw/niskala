'use client';

import { useEffect, useRef, useState } from 'react';
import type { SetupReport } from '@/lib/signals';
import type { CameraView } from '@/lib/store';
import { toast } from '@/lib/toast';
import { IconCamera, IconCheck, IconInfo, IconLock, IconRefresh } from './icons';
import { Badge } from './ui';
import { Segmented } from './ui-client';

export type Camera =
  | { state: 'off' | 'starting' }
  | { state: 'on'; preview: HTMLElement }
  | { state: 'error'; error: string };

const CALIBRATE_MS = 4000;
const SETUP_MS = 3000;

const PLACEMENT: Record<CameraView, { title: string; body: string; reads: string; misses?: string }> = {
  front: {
    title: 'Kamera di atas layar',
    body: 'Sejajar mata, kayak webcam laptop biasa.',
    reads: 'Bungkuk ke depan, miring ke samping, kepala miring, dan kedipan.',
  },
  side: {
    title: 'Kamera di samping',
    body: 'Di kiri atau kanan, setinggi bahu, 1 sampai 2 meter dari kursi, sampai telinga, bahu, dan pinggul kelihatan. Kalau pinggul ketutup meja, leher tetap dicek.',
    reads: 'Sudut leher dan punggung langsung, lebih akurat buat bungkuk ke depan.',
    misses: 'Miring ke samping dan kedipan nggak kebaca dari posisi ini.',
  },
};

export default function CameraPanel({ camera, onStart, onStop, calibrated, calibrate, checkSetup, previewElsewhere, view, onViewChange, cameras, cameraId, onCameraChange }: {
  camera: Camera;
  onStart: () => void;
  onStop: () => void;
  calibrated: boolean;
  calibrate: (ms: number) => Promise<boolean>;
  checkSetup: (ms: number) => Promise<SetupReport | null>;
  /** True while the preview lives in the mini monitor window. */
  previewElsewhere: boolean;
  view: CameraView;
  onViewChange: (v: CameraView) => void;
  cameras: { id: string; label: string }[];
  cameraId: string | null;
  onCameraChange: (id: string | null) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [calError, setCalError] = useState('');
  const [setup, setSetup] = useState<SetupReport | null>(null);
  const [setupState, setSetupState] = useState<'idle' | 'busy' | 'missed'>('idle');
  const preview = camera.state === 'on' ? camera.preview : null;
  const place = PLACEMENT[view];

  useEffect(() => {
    if (!preview || previewElsewhere || !slot.current) return;
    slot.current.append(preview);
  }, [preview, previewElsewhere]);

  async function runSetup() {
    setSetupState('busy');
    const report = await checkSetup(SETUP_MS);
    setSetup(report ?? setup);
    setSetupState(report ? 'idle' : 'missed');
  }

  async function runCalibration() {
    setCalError('');
    setProgress(0);
    const start = performance.now();
    const id = setInterval(() => setProgress(Math.min(1, (performance.now() - start) / CALIBRATE_MS)), 100);
    const ok = await calibrate(CALIBRATE_MS);
    clearInterval(id);
    setProgress(null);
    if (ok) toast('Kalibrasi kesimpan. Postur mulai dicek.');
    else
      setCalError(
        view === 'front'
          ? 'Wajahmu kurang lama kelihatan. Hadap ke layar, cahayanya dari depan, terus coba lagi.'
          : 'Telinga dan bahu kurang lama kelihatan. Mundurin kamera atau naikin dikit, terus coba lagi.',
      );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="label">Posisi kamera</p>
        <Segmented<CameraView>
          label="Posisi kamera"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'front', label: 'Depan' },
            { value: 'side', label: 'Samping' },
          ]}
        />
        <div className="rounded-xl bg-surface p-4 text-sm">
          <p className="font-semibold">{place.title}</p>
          <p className="mt-1 text-muted text-pretty">{place.body}</p>
          <p className="mt-3 flex gap-2 text-pretty">
            <IconCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            {place.reads}
          </p>
          {place.misses && (
            <p className="mt-1.5 flex gap-2 text-muted text-pretty">
              <IconInfo className="mt-0.5 size-4 shrink-0" />
              {place.misses}
            </p>
          )}
        </div>
        {cameras.length > 1 && (
          <label className="block">
            <span className="label block">Kamera yang dipakai</span>
            <select
              value={cameraId ?? ''}
              onChange={(e) => onCameraChange(e.target.value || null)}
              className="field mt-1 w-full text-sm"
            >
              <option value="">Bawaan browser</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {camera.state === 'off' || camera.state === 'error' ? (
        <div className="space-y-4 border-t border-rule pt-5">
          <p className="flex gap-3 text-sm text-muted text-pretty">
            <IconLock className="mt-0.5 size-4 shrink-0 text-accent" />
            Tiap gambar dicek di tab ini lalu dibuang. Yang disimpan cuma sudut dan waktu kedip, berupa angka di memori.
          </p>
          {camera.state === 'error' && (
            <p className="flex gap-2 text-sm text-alert-ink">
              <IconInfo className="mt-0.5 size-4 shrink-0" />
              {camera.error}
            </p>
          )}
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={onStart}>
            <IconCamera className="size-4" />
            {camera.state === 'error' ? 'Coba lagi' : 'Nyalain kamera'}
          </button>
        </div>
      ) : (
        <div className="space-y-4 border-t border-rule pt-5">
          {/* Mirrored like a mirror; the skeleton overlay flips with the video. */}
          <div
            ref={slot}
            className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl bg-surface text-center text-sm text-muted [&>div]:-scale-x-100"
          >
            {camera.state === 'starting' && <span className="px-4">Nyalain…</span>}
            {previewElsewhere && <span className="px-4">Videonya ada di jendela kecil</span>}
          </div>
          {camera.state === 'on' && !previewElsewhere && (
            <p className="text-sm text-muted text-pretty">
              {view === 'front'
                ? 'Garis kuning: garis mata dan ujung hidung. Dari situ miring, maju, dan bungkuknya dihitung.'
                : 'Garis kuning: telinga, bahu, dan pinggul yang dipakai ngukur. Titik merah artinya nggak kelihatan.'}
            </p>
          )}
          <div className="space-y-2 text-sm">
            {camera.state === 'starting' ? (
              <p className="text-muted">Ngambil model {view === 'front' ? 'wajah (4 MB)' : 'badan (6 MB)'}, cuma sekali di awal.</p>
            ) : calibrated ? (
              <>
                <Badge tone="accent" icon={IconCheck}>
                  Terkalibrasi
                </Badge>
                <p className="text-muted">Kalibrasi ulang kalau kamera atau kursinya pindah.</p>
              </>
            ) : (
              <>
                <Badge tone="alert">Belum dikalibrasi</Badge>
                <p className="text-muted">Duduk tegak kayak biasa kerja, terus tekan Kalibrasi.</p>
              </>
            )}
          </div>
          {camera.state === 'on' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={calibrated ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
                onClick={runCalibration}
                disabled={progress !== null || setupState === 'busy'}
              >
                <IconRefresh className="size-4" />
                {progress === null
                  ? calibrated
                    ? 'Kalibrasi ulang (4 dtk)'
                    : 'Kalibrasi (4 dtk)'
                  : `Tahan posisi… ${Math.ceil((1 - progress) * (CALIBRATE_MS / 1000))}`}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onStop}>
                Matikan kamera
              </button>
            </div>
          )}
          {calError && <p className="text-sm text-alert-ink">{calError}</p>}
          {camera.state === 'on' && view === 'front' && (
            <div className="space-y-3 border-t border-rule pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{setup ? `Setup meja: ${setup.score}/100` : 'Cek setup meja'}</p>
                <button type="button" className="btn btn-sm" onClick={runSetup} disabled={setupState === 'busy' || progress !== null}>
                  {setupState === 'busy' ? 'Lihat layar, diam sebentar…' : setup ? 'Cek lagi' : 'Cek jarak, tinggi, cahaya (3 dtk)'}
                </button>
              </div>
              {setupState === 'missed' && <p className="text-sm text-alert-ink">Wajahmu kurang lama kelihatan. Hadap ke layar, terus coba lagi.</p>}
              {setup && (
                <ul className="space-y-3">
                  {setup.checks.map((c) => (
                    <li key={c.key} className="flex gap-2.5 text-sm">
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${c.ok ? 'bg-accent-soft text-accent' : 'bg-kunyit-soft text-alert-ink'}`}>
                        {c.ok ? <IconCheck className="size-3" /> : <IconInfo className="size-3" />}
                      </span>
                      <span className="text-pretty">
                        <span className="font-semibold">{c.label}</span>
                        <span className="text-muted">: {c.value}. </span>
                        {c.tip}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!setup && setupState !== 'missed' && (
                <p className="text-sm text-muted text-pretty">Kamera ngukur jarak matamu ke layar, tinggi layar, dan cahaya di ruangan, terus ngasih saran yang bisa langsung dibenerin.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
