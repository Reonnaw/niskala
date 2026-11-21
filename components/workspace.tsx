'use client';

import Link from 'next/link';
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { duration, hhmm, minutes, parseHhmm, sideWord } from '@/lib/format';
import { ROUTINES } from '@/lib/routines';
import { SENSITIVITY, dominant, driftOf, glowFrom, type Posture, type Sensitivity } from '@/lib/signals';
import { chime } from '@/lib/sound';
import { byDay, dayScore, streak } from '@/lib/insights';
import { clearAll, exportData, prefsStore, sessionsStore, type CameraView, type Mode, type Prefs, type Warmth } from '@/lib/store';
import { syncConfigured } from '@/lib/sync';
import { allowNotifications, canNotify } from '@/lib/notify';
import { toast } from '@/lib/toast';
import { useMonitor, type BreakKind, type Routine, type Sim, type Snapshot } from '@/lib/use-monitor';
import { describeCameraError, listCameras, startVision } from '@/lib/vision';
import { SAY, doneLine, hush, speak } from '@/lib/voice';
import CameraPanel, { type Camera } from './camera-panel';
import {
  IconBell,
  IconCamera,
  IconDownload,
  IconEye,
  IconGauge,
  IconHistory,
  IconInfo,
  IconLean,
  IconMoon,
  IconPip,
  IconPosture,
  IconRefresh,
  IconSliders,
  IconStretch,
  IconTimer,
  IconTrash,
  IconVolume,
} from './icons';
import { openMiniMonitor, usePipSupported } from './mini-monitor';
import Onboarding from './onboarding';
import { CastPicker } from './cast';
import PostureFigure, { FrontFigure, HEAD_MAX_DEG, SIDE_MAX_DEG, TILT_MAX_DEG, TORSO_MAX_DEG } from './posture-figure';
import RoutineRunner, { type Upright } from './routine';
import { Badge, Meter, Stat } from './ui';
import { ConfirmDialog, Segmented, Switch, Tabs } from './ui-client';

const noop = () => () => {};
type Tab = 'track' | 'breaks' | 'evening' | 'settings';

const SENSITIVITY_NOTE: Record<Sensitivity, string> = {
  gentle: 'Cuma nandain bungkuk atau miring yang jelas, setelah sekitar 16 detik.',
  balanced: 'Nandain bungkuk atau miring sedang, setelah sekitar 10 detik.',
  strict: 'Geser dikit aja ketahuan, setelah sekitar 6 detik.',
};

const CUE_TEXT: Record<BreakKind, [string, string]> = {
  eye: ['Waktunya istirahat mata 20 detik.', 'Lihat yang jauh, terus kedip penuh.'],
  reset: ['Waktunya stretching 60 detik.', 'Leher, bahu, dan mata, dipandu satu-satu.'],
};

function postureWord(p: Posture, threshold: number) {
  const drift = driftOf(p);
  if (drift < threshold * 0.45) return 'Tegak';
  if (drift < threshold) return 'Mulai geser';
  const d = dominant(p);
  return d.kind === 'forward' ? 'Bungkuk ke depan' : d.kind === 'side' ? `Miring ke ${d.dir}` : `Kepala miring ke ${d.dir}`;
}

function statusLine(snap: Snapshot, mode: Mode, cameraOn: boolean, calibrated: boolean, routine: Routine | null, view: CameraView) {
  if (routine) return routine === 'train' ? 'Lagi latihan postur. Pinggir layar nggak nyala sampai selesai.' : 'Lagi jeda. Pinggir layar nggak bakal nyala sampai selesai.';
  if (snap.away) return 'Kamu lagi nggak di depan layar. Waktu ini nggak dihitung waktu layar, tapi jadi jeda.';
  if (mode === 'timer') return 'Mode timer: jeda datang sesuai jadwal. Postur dan kedipan nggak dicek.';
  if (mode === 'camera' && !cameraOn) return 'Kamera mati. Nyalain di tab Mode, atau pakai mode timer.';
  if (mode === 'camera' && !calibrated) return 'Kalibrasi sekali dulu biar Niskala tahu posisi tegakmu.';
  if (mode === 'camera' && !snap.posture)
    return view === 'front'
      ? 'Wajahmu nggak kelihatan. Lanjut lagi pas kamu balik.'
      : 'Telinga atau bahu nggak kelihatan. Lanjut lagi pas badanmu masuk bingkai.';
  if (snap.glow > 0 && snap.driftFor === 0 && snap.lowBlinkFor === 0) return 'Udah bagus lagi. Pinggir layar padam sebentar lagi.';
  if (snap.glow > 0 && snap.postureStrain >= snap.eyeStrain && snap.posture) {
    const d = dominant(snap.posture);
    // Right after a break the timer restarts while the glow is still fading; skip a "0 dtk" duration.
    const t = snap.driftFor >= 1 ? ` selama ${duration(snap.driftFor)}` : '';
    if (d.kind === 'forward') return `Pinggir layar nyala karena kamu bungkuk ke depan${t}. Duduk tegak, atau stretching 60 detik.`;
    if (d.kind === 'side') return `Pinggir layar nyala karena badanmu miring ke ${d.dir}${t}. Geser duduk ke tengah kursi.`;
    return `Pinggir layar nyala karena kepalamu miring ke ${d.dir}${t}. Luruskan leher, terus sejajarin layar sama mata.`;
  }
  if (snap.glow > 0)
    return `Pinggir layar nyala karena kamu cuma ngedip ${Math.round(snap.blinkRate ?? 0)} kali per menit${snap.lowBlinkFor >= 1 ? ` selama ${duration(snap.lowBlinkFor)}` : ''}. Kedip penuh, atau lihat jauh sebentar.`;
  if (snap.tooClose && snap.distanceCm !== null) return `Kamu kedeketan ke layar, sekitar ${snap.distanceCm} cm. Mundur dikit sampai sekitar satu lengan, 50 sampai 75 cm.`;
  if (snap.driftFor > 0) return 'Postur mulai geser. Pinggir layar baru nyala kalau kelamaan.';
  if (snap.lowBlinkFor > 0) return 'Kedipan mulai jarang. Pinggir layar baru nyala kalau terus begitu.';
  if (snap.backHidden) return 'Pinggulmu ketutup, jadi yang dicek cuma leher. Mundurin atau naikin kamera biar punggung ikut kebaca.';
  return 'Tegak, ngedip normal. Aman.';
}

function nextBreak(snap: Snapshot) {
  if (snap.cue) return { value: 'Sekarang', detail: ROUTINES[snap.cue].short.toLowerCase() };
  const opts = [
    snap.nextEyeS !== null ? { s: snap.nextEyeS, what: 'istirahat mata' } : null,
    snap.nextResetS !== null ? { s: snap.nextResetS, what: 'stretching' } : null,
  ].filter((o) => o !== null);
  if (!opts.length) return { value: 'Mati', detail: 'tanpa jadwal' };
  const n = opts.reduce((a, b) => (b.s < a.s ? b : a));
  return { value: `${Math.max(1, Math.ceil(n.s / 60))} mnt lagi`, detail: n.what };
}

function guidance(snap: Snapshot, bedtime: number) {
  const { stage, minutesToBed } = snap.night;
  if (stage === 'day') return `Layar mulai hangat jam ${hhmm((bedtime + 1440 - 120) % 1440)}, dua jam sebelum jam tidurmu (${hhmm(bedtime)}).`;
  if (stage === 'wind-down')
    return `${minutesToBed} menit lagi jam tidur. Beresin yang lagi dikerjain, tugas baru simpan buat besok. Catat kamu berhenti di mana biar besok gampang lanjut.`;
  const ran = snap.session ? minutes(snap.session.active_s) : '';
  return `Udah ${-minutesToBed} menit lewat jam tidurmu, dan sesi ini jalan ${ran}. Layar terang jam segini bikin susah ngantuk. Simpan kerjaanmu dan berhenti di jeda berikutnya.`;
}

function StatePill({ posture, threshold, small = false }: { posture: Posture; threshold: number; small?: boolean }) {
  const off = driftOf(posture) >= threshold;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl font-bold shadow-[0_1px_2px_var(--shadow)] ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
        off ? 'bg-alert text-[#2a1f19]' : 'bg-accent text-on-accent'
      }`}
    >
      <span className="live-dot" aria-hidden />
      {postureWord(posture, threshold)}
    </span>
  );
}

function Slider({ label, value, min = 0, max, unit, onChange }: {
  label: string;
  value: number;
  min?: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const v = Math.round(value);
  const shown = min < 0 ? (v === 0 ? `0${unit}` : `${Math.abs(v)}${unit} ${sideWord(v)}`) : `${v}${unit}`;
  return (
    <label className="block">
      <span className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{shown}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-1"
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      {children}
    </div>
  );
}

function CueBanner({ cue, onStart, onSnooze }: { cue: BreakKind; onStart: () => void; onSnooze: () => void }) {
  const [title, body] = CUE_TEXT[cue];
  return (
    <div role="status" className="enter card flex flex-wrap items-center gap-x-4 gap-y-3 border-cue px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <IconBell className="size-5" />
      </span>
      <p className="min-w-48 flex-1 text-sm">
        <span className="font-semibold">{title}</span> <span className="text-muted">{body}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={onStart}>
          Mulai
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSnooze}>
          Nanti 5 menit
        </button>
      </div>
    </div>
  );
}

export default function Workspace() {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.get, prefsStore.server);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const pipSupported = usePipSupported();
  const notifySupported = useSyncExternalStore(noop, canNotify, () => false);
  const sessions = useSyncExternalStore(sessionsStore.subscribe, sessionsStore.get, sessionsStore.server);
  const [sim, setSim] = useState<Sim>({ head: 0, torso: 0, side: 0, tilt: 0, blink: 16, late: false });
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [camera, setCamera] = useState<Camera>({ state: 'off' });
  const [pip, setPip] = useState<Window | null>(null);
  const [tab, setTab] = useState<Tab>('track');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const cameraRun = useRef<{ token: number; stop?: () => void }>({ token: 0 });

  const mode = prefs.mode;
  const cameraOn = camera.state === 'on';
  const mon = useMonitor({ mode, cameraOn, sim, prefs, routine, timerWindow: pip });
  const { snap } = mon;
  const calibrated = mon.calibrated;
  const view = prefs.cameraView;
  const update = (p: Partial<Prefs>) => prefsStore.set({ ...prefs, ...p });

  async function startCamera(opts: { view: CameraView; deviceId: string | null } = { view, deviceId: prefs.cameraId }) {
    const token = ++cameraRun.current.token;
    setCamera({ state: 'starting' });
    try {
      const v = await startVision(mon.onSample, opts);
      if (token !== cameraRun.current.token) return v.stop();
      cameraRun.current.stop = v.stop;
      setCamera({ state: 'on', preview: v.preview });
      // Device names are only readable once permission is granted.
      listCameras().then(setCameras, () => {});
    } catch (e) {
      if (token === cameraRun.current.token) setCamera({ state: 'error', error: describeCameraError(e) });
    }
  }

  function stopCamera() {
    cameraRun.current.token++;
    cameraRun.current.stop?.();
    cameraRun.current.stop = undefined;
    setCamera({ state: 'off' });
  }

  // A different camera position needs a different model, so a running camera restarts.
  function changeCamera(p: { cameraView?: CameraView; cameraId?: string | null }) {
    const next = { ...prefs, ...p };
    prefsStore.set(next);
    if (camera.state === 'on' || camera.state === 'starting') {
      stopCamera();
      startCamera({ view: next.cameraView, deviceId: next.cameraId });
    }
  }

  function setMode(m: Mode) {
    if (m !== 'camera') stopCamera();
    update({ mode: m });
  }

  async function toggleMini() {
    if (pip) return pip.close();
    try {
      const w = await openMiniMonitor();
      w.addEventListener('pagehide', () => setPip(null), { once: true });
      setPip(w);
    } catch {
      toast('Jendela kecil diblokir browser. Izinin pop-up buat situs ini, terus coba lagi.', 'info');
    }
  }

  async function setNotify(on: boolean) {
    if (!on) return update({ notify: false });
    if (await allowNotifications()) {
      // Read fresh prefs: the permission prompt may have taken a while.
      prefsStore.set({ ...prefsStore.get(), notify: true });
      toast('Notifikasi desktop nyala.');
    } else {
      toast('Izin notifikasi ditolak. Nyalain dari pengaturan situs di browser.', 'info');
    }
  }

  function finishRoutine(upright: Upright) {
    if (!routine) return;
    mon.completeRoutine(routine);
    const done = `${ROUTINES[routine].title} selesai.`;
    // A score only means something when the camera saw you for a fair part of the checked steps.
    const msg = routine === 'train' && upright.measured >= 10 ? `${done} Kamu tegak ${Math.round(upright.held)} dari ${Math.round(upright.measured)} detik.` : done;
    toast(msg);
    if (prefs.voice) speak(doneLine(routine, upright));
    setRoutine(null);
  }

  // Stopping early is not the same as taking the break: bring the reminder back in 5 minutes.
  function stopRoutine() {
    if (!routine) return;
    hush();
    if (routine !== 'train') {
      mon.snooze(routine);
      toast('Jeda distop. Diingetin lagi 5 menit lagi.', 'info');
    }
    setRoutine(null);
  }

  function snooze(kind: BreakKind) {
    mon.snooze(kind);
    toast('Oke, diingetin lagi 5 menit lagi.', 'info');
  }

  useEffect(() => {
    const run = cameraRun.current;
    const refresh = () => listCameras().then(setCameras, () => {});
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refresh);
      run.stop?.();
    };
  }, []);

  useEffect(() => {
    // The video must sit in a visible document for frames to keep flowing while this tab is hidden.
    if (!pip || camera.state !== 'on') return;
    const holder = pip.document.createElement('div');
    holder.className = 'offscreen-video';
    holder.append(camera.preview);
    pip.document.body.append(holder);
  }, [pip, camera]);

  useEffect(() => () => pip?.close(), [pip]);

  useEffect(() => {
    const t = snap.returnedAfter;
    if (t === null || t < 120) return;
    toast(`Selamat datang lagi. ${minutes(t)} tadi dihitung ${t >= 300 ? 'stretching' : 'istirahat mata'}.`);
  }, [snap.returnedAfter]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    if (e.key === 'Escape' && routine) stopRoutine();
    else if (routine || !prefs.onboarded) return;
    else if (e.key === 'r') setRoutine('reset');
    else if (e.key === 'e') setRoutine('eye');
    else if (e.key === 'l') setRoutine('train');
    else if (e.key === 'm') toggleMini();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const S = SENSITIVITY[prefs.sensitivity];
  const warmth = prefs.warmth === 'on' ? 1 : prefs.warmth === 'off' ? 0 : snap.night.level;
  const tracked = mode === 'demo' || (mode === 'camera' && cameraOn);
  const posture = tracked ? snap.posture : null;
  const session = snap.session;
  const next = nextBreak(snap);
  // The current session is saved every 15 s, so today's score follows it closely. The clock is read only
  // after hydration: the prerendered page has no "today".
  const days = hydrated ? byDay(sessions, 60, new Date()) : [];
  const todayScore = days.length ? dayScore(days[days.length - 1]) : null;
  const run = streak(days);
  const status = statusLine(snap, mode, cameraOn, calibrated, routine, view);
  // The tab title is visible from the taskbar or another monitor, so it carries the state too.
  const title = routine
    ? `${ROUTINES[routine].short} · Niskala`
    : snap.cue
      ? 'Waktunya jeda · Niskala'
      : snap.glow > 0
        ? `${snap.postureStrain >= snap.eyeStrain && snap.posture ? postureWord(snap.posture, S.drift) : 'Kedip jarang'} · Niskala`
        : snap.away
          ? 'Lagi pergi · Niskala'
          : 'Ruang Kerja · Niskala';
  // A side camera sees the profile: forward lean only, no sideways lean or blinks.
  const sideOnly = mode === 'camera' && view === 'side';
  const deg = posture && {
    torso: Math.round(posture.torso * TORSO_MAX_DEG),
    head: Math.round(posture.head * HEAD_MAX_DEG),
    side: Math.round(posture.side * SIDE_MAX_DEG),
    tilt: Math.round(posture.tilt * TILT_MAX_DEG),
  };
  const modeBadge =
    mode === 'camera'
      ? { text: cameraOn ? 'Kamera nyala · di perangkat' : 'Kamera mati', icon: IconCamera }
      : mode === 'timer'
        ? { text: 'Mode timer', icon: IconTimer }
        : { text: 'Mode demo', icon: IconSliders };

  useEffect(() => {
    document.title = title;
  }, [title]);

  const runner = routine && (
    <RoutineRunner
      key={routine}
      kind={routine}
      who={prefs.figure}
      posture={snap.posture}
      threshold={S.drift}
      blinkTotal={snap.blinkTotal}
      voice={prefs.voice}
      onDone={finishRoutine}
      onExit={stopRoutine}
      compact={pip !== null}
    />
  );
  const overlays = (
    <>
      <div aria-hidden className="edge-glow" style={{ opacity: snap.glow }} />
      <div aria-hidden className="edge-cue" style={{ opacity: snap.cue && !routine ? 0.75 : 0 }} />
      <div aria-hidden className="warm-shift" style={{ opacity: warmth * 0.3 }} />
    </>
  );

  if (hydrated && !prefs.onboarded) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <Onboarding prefs={prefs} />
      </main>
    );
  }

  return (
    <>
      {overlays}
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-8">
        <h1 className="sr-only">Ruang kerja Niskala</h1>
        <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Badge tone={cameraOn ? 'accent' : 'neutral'} live={cameraOn} icon={cameraOn ? undefined : modeBadge.icon}>
            {modeBadge.text}
          </Badge>
          <p className="text-sm">
            <span className="text-muted">Sesi </span>
            <span className="font-semibold tabular-nums">{session ? minutes(session.active_s) : '0 dtk'}</span>
          </p>
          <p className="text-sm" title="Dari waktu tegak dan kedipan yang dicek hari ini. Target 70.">
            <span className="text-muted">Skor hari ini </span>
            <span className="font-semibold tabular-nums">{todayScore ?? '–'}</span>
            {run > 0 && <span className="text-muted"> · {run} hari beruntun</span>}
          </p>
          <p className="text-sm">
            <span className="text-muted">Jeda berikutnya </span>
            <span className="font-semibold tabular-nums">{next.value}</span>
            <span className="text-muted"> · {next.detail}</span>
          </p>
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <button type="button" className="btn btn-sm flex-1 sm:flex-none" disabled={routine !== null} onClick={() => setRoutine('reset')}>
              <IconStretch className="size-4" />
              Stretching 60 dtk
            </button>
            <button type="button" className="btn btn-sm flex-1 sm:flex-none" disabled={routine !== null} onClick={() => setRoutine('train')}>
              <IconPosture className="size-4" />
              Latihan postur
            </button>
            <button type="button" className="btn btn-sm flex-1 sm:flex-none" onClick={toggleMini} aria-pressed={pip !== null}>
              <IconPip className="size-4" />
              {pip ? 'Tutup jendela kecil' : 'Jendela kecil'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
          <section aria-label="Postur langsung" className="min-w-0 space-y-4">
            <div className="stage card relative overflow-hidden">
              <div className="mx-auto aspect-[1150/1180] max-h-[52vh] w-full lg:max-h-[60vh]">
                <PostureFigure posture={posture} who={prefs.figure} />
              </div>
              {posture && (
                <div className="absolute top-3 left-3">
                  <StatePill posture={posture} threshold={S.drift} />
                </div>
              )}
              <figure className="card absolute top-3 right-3 w-[30%] max-w-48 min-w-24 p-1.5">
                <div className="relative aspect-[560/760] rounded-xl bg-surface">
                  <FrontFigure posture={sideOnly ? null : posture} who={prefs.figure} />
                  {sideOnly && (
                    <p className="absolute inset-0 grid place-items-center rounded-xl bg-raised/85 p-2 text-center text-[11px] leading-snug font-semibold text-muted">
                      Nggak kebaca dari kamera samping
                    </p>
                  )}
                </div>
                {/* Its own radio name: the Setelan tab can show a second picker at the same time. */}
                <div className="mt-1.5 flex justify-center">
                  <CastPicker value={prefs.figure} onChange={(figure) => update({ figure })} size="size-8" label="Ganti figur" />
                </div>
              </figure>
              {deg && (
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5" aria-label="Sudut saat ini">
                  <span className="chip">Punggung {deg.torso}°</span>
                  <span className="chip">Kepala {deg.head}°</span>
                  <span className="chip">
                    Miring {Math.abs(deg.side)}°{deg.side !== 0 && ` ${sideWord(deg.side)}`}
                  </span>
                  {snap.distanceCm !== null && <span className={`chip ${snap.tooClose ? 'text-alert-ink' : ''}`}>Jarak ±{snap.distanceCm} cm</span>}
                </div>
              )}
            </div>

            {routine ? (
              pip ? (
                <p className="card p-4 text-muted">{ROUTINES[routine].title} lagi jalan di jendela kecil.</p>
              ) : (
                runner
              )
            ) : (
              <>
                {snap.cue && <CueBanner cue={snap.cue} onStart={() => setRoutine(snap.cue)} onSnooze={() => snooze(snap.cue!)} />}
                <p className="flex gap-2.5 text-sm text-pretty">
                  <IconInfo className="mt-0.5 size-4 shrink-0 text-muted" />
                  {status}
                </p>
                {tracked && (
                  <div className="card grid gap-5 p-4 sm:grid-cols-2">
                    <Meter
                      label="Tegang di postur"
                      value={snap.postureStrain}
                      threshold={0.3}
                      hint={snap.glow > 0 && snap.postureStrain >= snap.eyeStrain ? 'pinggir nyala' : glowFrom(snap.postureStrain) > 0 ? 'hampir' : 'aman'}
                    />
                    <Meter
                      label="Capek di mata"
                      value={snap.eyeStrain}
                      threshold={0.3}
                      hint={sideOnly ? 'nggak kebaca dari samping' : snap.blinkRate === null ? 'ngukur…' : `${Math.round(snap.blinkRate)} kedip/mnt`}
                    />
                  </div>
                )}
                <div className="card grid gap-x-8 px-4 py-1 sm:grid-cols-2 [&>*]:border-b [&>*]:border-rule sm:[&>*:nth-last-child(-n+2)]:border-b-0 [&>*:last-child]:border-b-0">
                  <Stat
                    icon={IconPosture}
                    label="Postur"
                    value={posture ? postureWord(posture, S.drift) : 'Nggak dicek'}
                    tone={posture && driftOf(posture) >= S.drift ? 'alert' : undefined}
                  />
                  <Stat
                    icon={IconLean}
                    label="Miring"
                    value={
                      sideOnly && cameraOn
                        ? 'Nggak kebaca'
                        : !deg
                          ? 'Nggak dicek'
                          : Math.abs(deg.side) < 2 && Math.abs(deg.tilt) < 3
                            ? 'Lurus'
                            : Math.abs(deg.side) * (TILT_MAX_DEG / SIDE_MAX_DEG) >= Math.abs(deg.tilt)
                              ? `Badan ${Math.abs(deg.side)}° ${sideWord(deg.side)}`
                              : `Kepala ${Math.abs(deg.tilt)}° ${sideWord(deg.tilt)}`
                    }
                  />
                  <Stat
                    icon={IconEye}
                    hue="hue-daun"
                    label="Kedip"
                    value={sideOnly ? 'Nggak kebaca' : snap.blinkRate === null ? (tracked ? 'Ngukur' : 'Nggak dicek') : `${Math.round(snap.blinkRate)}/mnt`}
                    tone={snap.blinkRate !== null && snap.blinkRate < S.lowBlink ? 'alert' : undefined}
                  />
                  <Stat icon={IconTimer} hue="hue-kunyit" label="Bungkuk sesi ini" value={minutes(session?.slouch_s ?? 0)} />
                </div>
              </>
            )}
          </section>

          <aside className="card self-start overflow-hidden lg:sticky lg:top-20">
            <Tabs<Tab>
              label="Pengaturan ruang kerja"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'track', label: 'Mode', icon: IconCamera },
                { value: 'breaks', label: 'Jeda', icon: IconTimer },
                { value: 'evening', label: 'Malam', icon: IconMoon },
                { value: 'settings', label: 'Setelan', icon: IconGauge },
              ]}
            />
            <div role="tabpanel" className="space-y-6 p-5">
              {tab === 'track' && (
                <>
                  <Segmented<Mode>
                    label="Cara ngecek"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: 'camera', label: 'Kamera', icon: IconCamera },
                      { value: 'timer', label: 'Timer', icon: IconTimer },
                      { value: 'demo', label: 'Demo', icon: IconSliders },
                    ]}
                  />
                  {mode === 'camera' && (
                    <CameraPanel
                      camera={camera}
                      onStart={() => startCamera()}
                      onStop={stopCamera}
                      calibrated={calibrated}
                      calibrate={mon.calibrate}
                      checkSetup={mon.checkSetup}
                      previewElsewhere={pip !== null}
                      view={view}
                      onViewChange={(cameraView) => changeCamera({ cameraView })}
                      cameras={cameras}
                      cameraId={prefs.cameraId}
                      onCameraChange={(cameraId) => changeCamera({ cameraId })}
                    />
                  )}
                  {mode === 'timer' && (
                    <p className="text-sm text-muted text-pretty">
                      Kamera nggak dipakai. Istirahat mata dan stretching ikut jadwal di tab Jeda.
                    </p>
                  )}
                  {mode === 'demo' && (
                    <div className="space-y-4">
                      <Slider label="Kepala ke depan" value={sim.head * HEAD_MAX_DEG} max={HEAD_MAX_DEG} unit="°" onChange={(v) => setSim({ ...sim, head: v / HEAD_MAX_DEG })} />
                      <Slider label="Punggung bungkuk" value={sim.torso * TORSO_MAX_DEG} max={TORSO_MAX_DEG} unit="°" onChange={(v) => setSim({ ...sim, torso: v / TORSO_MAX_DEG })} />
                      <Slider
                        label="Badan miring"
                        value={sim.side * SIDE_MAX_DEG}
                        min={-SIDE_MAX_DEG}
                        max={SIDE_MAX_DEG}
                        unit="°"
                        onChange={(v) => setSim({ ...sim, side: v / SIDE_MAX_DEG })}
                      />
                      <Slider
                        label="Kepala miring"
                        value={sim.tilt * TILT_MAX_DEG}
                        min={-TILT_MAX_DEG}
                        max={TILT_MAX_DEG}
                        unit="°"
                        onChange={(v) => setSim({ ...sim, tilt: v / TILT_MAX_DEG })}
                      />
                      <Slider label="Kedipan" value={sim.blink} max={30} unit="/mnt" onChange={(v) => setSim({ ...sim, blink: v })} />
                      <Switch checked={sim.late} onChange={(late) => setSim({ ...sim, late })} label="Pura-pura udah larut" description="Jamnya dibikin 40 menit lewat jam tidur." />
                      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
                        <span className="text-sm font-semibold">Coba pengingat:</span>
                        <button type="button" className="btn btn-sm" onClick={() => mon.triggerCue('eye')}>
                          Istirahat mata
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => mon.triggerCue('reset')}>
                          Stretching
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'breaks' && (
                <>
                  <Field label="Istirahat mata 20 detik">
                    <Segmented
                      label="Istirahat mata"
                      value={prefs.eyeMin}
                      onChange={(eyeMin) => update({ eyeMin })}
                      options={[
                        { value: 20, label: 'Tiap 20 mnt' },
                        { value: 30, label: '30 mnt' },
                        { value: 0, label: 'Mati' },
                      ]}
                    />
                  </Field>
                  <Field label="Stretching 60 detik">
                    <Segmented
                      label="Stretching"
                      value={prefs.resetMin}
                      onChange={(resetMin) => update({ resetMin })}
                      options={[
                        { value: 30, label: '30 mnt' },
                        { value: 50, label: '50 mnt' },
                        { value: 60, label: '60 mnt' },
                        { value: 0, label: 'Mati' },
                      ]}
                    />
                  </Field>
                  <div>
                    <Switch checked={prefs.sound} onChange={(sound) => update({ sound })} label="Bunyi pelan" description="Pas jeda datang, atau pinggir layar mulai nyala." />
                    <button type="button" className="btn btn-ghost btn-sm mt-1 -ml-3" onClick={chime}>
                      <IconVolume className="size-4" />
                      Coba dengar
                    </button>
                  </div>
                  <div>
                    <Switch
                      checked={prefs.voice}
                      onChange={(voice) => update({ voice })}
                      label="Suara pengingat"
                      description="Ngasih tahu kalau kamu bungkuk atau miring, pas jeda datang, dan mandu tiap gerakan."
                    />
                    <button type="button" className="btn btn-ghost btn-sm mt-1 -ml-3" onClick={() => speak(SAY.back)}>
                      <IconVolume className="size-4" />
                      Coba dengar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-rule pt-5">
                    <button type="button" className="btn btn-sm" disabled={routine !== null} onClick={() => setRoutine('eye')}>
                      <IconEye className="size-4" />
                      Istirahat mata
                    </button>
                    <button type="button" className="btn btn-sm" disabled={routine !== null} onClick={() => setRoutine('reset')}>
                      <IconStretch className="size-4" />
                      Stretching
                    </button>
                    <button type="button" className="btn btn-sm col-span-2" disabled={routine !== null} onClick={() => setRoutine('train')}>
                      <IconPosture className="size-4" />
                      Latihan postur 2 menit
                    </button>
                  </div>
                  <div className="rounded-xl bg-surface p-4 text-[13px] text-muted">
                    <p className="mb-2 font-semibold text-ink">Tombol pintas</p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <li>
                        <kbd className="kbd">R</kbd> stretching
                      </li>
                      <li>
                        <kbd className="kbd">E</kbd> istirahat mata
                      </li>
                      <li>
                        <kbd className="kbd">L</kbd> latihan postur
                      </li>
                      <li>
                        <kbd className="kbd">M</kbd> jendela kecil
                      </li>
                      <li>
                        <kbd className="kbd">Esc</kbd> stop jeda
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {tab === 'evening' && (
                <>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <label>
                      <span className="label block">Jam tidur</span>
                      <input
                        type="time"
                        value={hhmm(prefs.bedtime)}
                        onChange={(e) => {
                          const m = parseHhmm(e.target.value);
                          if (m !== null) update({ bedtime: m });
                        }}
                        className="field mt-1"
                      />
                    </label>
                    <p>
                      <span className="label block">Sekarang</span>
                      <span className="mt-1 inline-block py-1.5 font-semibold tabular-nums">
                        {snap.night.clock || '--:--'}
                        {sim.late && mode === 'demo' && <span className="font-normal text-muted"> (simulasi)</span>}
                      </span>
                    </p>
                  </div>
                  <Field label="Layar hangat">
                    <Segmented<Warmth>
                      label="Layar hangat"
                      value={prefs.warmth}
                      onChange={(warmth) => update({ warmth })}
                      options={[
                        { value: 'auto', label: 'Ikut jam tidur' },
                        { value: 'on', label: 'Nyala' },
                        { value: 'off', label: 'Mati' },
                      ]}
                    />
                  </Field>
                  <div className="flex gap-3 rounded-xl bg-surface p-4 text-sm">
                    <IconMoon className="mt-0.5 size-4 shrink-0 text-accent" />
                    <p className="text-pretty">{guidance(snap, prefs.bedtime)}</p>
                  </div>
                  <p className="text-sm text-pretty">Warna hangat ini cuma di Niskala. Nyalain juga night light di sistem biar seluruh layar ikut.</p>
                </>
              )}

              {tab === 'settings' && (
                <>
                  <Field label="Figur">
                    <CastPicker value={prefs.figure} onChange={(figure) => update({ figure })} />
                  </Field>
                  <div className="space-y-4 rounded-xl bg-surface p-4">
                    <p className="text-pretty">
                      <span className="font-semibold">Dua monitor? </span>
                      <span className="text-muted">
                        {pipSupported
                          ? 'Jendela kecil selalu di atas aplikasi lain. Seret aja ke monitor tempat kamu kerja.'
                          : 'Jendela kecil kebuka terpisah. Seret aja ke monitor tempat kamu kerja.'}
                      </span>
                    </p>
                    <button type="button" className="btn btn-sm" onClick={toggleMini}>
                      <IconPip className="size-4" />
                      {pip ? 'Tutup jendela kecil' : 'Buka jendela kecil'}
                    </button>
                    {notifySupported && (
                      <Switch
                        checked={prefs.notify}
                        onChange={setNotify}
                        label="Notifikasi desktop"
                        description="Muncul pas jeda datang atau postur geser, waktu kamu lagi nggak lihat Niskala."
                      />
                    )}
                  </div>
                  <Field label="Kepekaan">
                    <Segmented<Sensitivity>
                      label="Kepekaan"
                      value={prefs.sensitivity}
                      onChange={(sensitivity) => update({ sensitivity })}
                      options={[
                        { value: 'gentle', label: 'Santai' },
                        { value: 'balanced', label: 'Sedang' },
                        { value: 'strict', label: 'Ketat' },
                      ]}
                    />
                    <p className="mt-2 text-[13px] text-muted">{SENSITIVITY_NOTE[prefs.sensitivity]}</p>
                  </Field>
                  <div className="space-y-4 border-t border-rule pt-5">
                    <p className="text-sm text-muted text-pretty">
                      Yang disimpan di browser ini: setelan, kalibrasi, dan ringkasan tiap sesi. Nggak ada gambar atau data wajah yang
                      disimpan.
                    </p>
                    {syncConfigured && (
                      <div>
                        <Switch checked={prefs.sync} onChange={(sync) => update({ sync })} label="Cadangkan ringkasan" description="Anonim, bisa dimatiin kapan aja." />
                        <p className="mt-2 text-[13px] text-muted">
                          {mon.sync.state === 'off' && 'Mati. Nggak ada yang keluar dari browser ini.'}
                          {mon.sync.state === 'idle' && 'Nyala. Cadangan pertama dalam semenit.'}
                          {mon.sync.state === 'ok' && `Udah dicadangin jam ${new Date(mon.sync.at).toLocaleTimeString('id-ID')}.`}
                          {mon.sync.state === 'error' && `Gagal nyadangin (${mon.sync.message}). Datamu tetap aman di sini.`}
                        </p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Link href="/riwayat" className="btn btn-sm justify-start">
                        <IconHistory className="size-4" />
                        Lihat riwayat
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm justify-start"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
                          a.download = 'niskala-data.json';
                          a.click();
                          URL.revokeObjectURL(a.href);
                          toast('Data kesimpan sebagai niskala-data.json.');
                        }}
                      >
                        <IconDownload className="size-4" />
                        Unduh dataku
                      </button>
                      <button type="button" className="btn btn-sm justify-start" onClick={() => update({ onboarded: false })}>
                        <IconRefresh className="size-4" />
                        Ulang setup awal
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm justify-start text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
                        <IconTrash className="size-4" />
                        Hapus data di browser ini
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus semua data di browser ini?"
        body="Kalibrasi, setelan, dan semua ringkasan sesi di browser ini bakal dihapus. Nggak bisa dibalikin."
        confirm="Hapus"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          mon.discardSession();
          clearAll();
          location.reload();
        }}
      />

      {pip &&
        createPortal(
          <>
            {overlays}
            <main className="flex h-dvh flex-col gap-2.5 p-3">
              <div className="stage relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-rule">
                <PostureFigure posture={posture} who={prefs.figure} />
                {posture && (
                  <div className="absolute top-2 left-2">
                    <StatePill posture={posture} threshold={S.drift} small />
                  </div>
                )}
                <div className="absolute top-2 right-2 w-[30%] rounded-xl border border-rule bg-raised p-1">
                  <div className="aspect-[560/760] rounded-lg bg-surface">
                    <FrontFigure posture={sideOnly ? null : posture} who={prefs.figure} />
                  </div>
                </div>
              </div>
              {tracked && !routine && (
                <div className="h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden>
                  <div
                    className={`h-full origin-left rounded-full transition-transform duration-300 ${snap.glow > 0 ? 'bg-alert' : 'bg-accent'}`}
                    style={{ transform: `scaleX(${Math.max(0.03, Math.max(snap.postureStrain, snap.eyeStrain))})` }}
                  />
                </div>
              )}
              {runner ||
                (snap.cue ? (
                  <CueBanner cue={snap.cue} onStart={() => setRoutine(snap.cue)} onSnooze={() => snooze(snap.cue!)} />
                ) : (
                  <p className="flex items-center gap-2 text-sm">
                    <IconTimer className="size-4 shrink-0 text-accent" />
                    <span className="text-muted">{next.value === 'Mati' ? 'Jadwal jeda mati' : `Jeda berikutnya ${next.value}`}</span>
                    <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setRoutine('reset')}>
                      Stretching
                    </button>
                  </p>
                ))}
            </main>
          </>,
          pip.document.body,
        )}
    </>
  );
}
