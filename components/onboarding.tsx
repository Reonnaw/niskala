'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { hhmm, parseHhmm } from '@/lib/format';
import { prefsStore, type Mode, type Prefs } from '@/lib/store';
import { IconArrowRight, IconCamera, IconCheck, IconMoon, IconSliders, IconTimer } from './icons';
import { CastPicker } from './cast';
import PostureFigure, { FrontFigure } from './posture-figure';
import { Segmented, Switch } from './ui-client';

const MODES: { value: Mode; title: string; body: string; icon: ComponentType<SVGProps<SVGSVGElement>>; tag?: string }[] = [
  {
    value: 'camera',
    title: 'Kamera',
    body: 'Ngecek postur dan kedipan. Kameranya boleh di depan atau di samping meja. Video dicek di tab ini dan nggak pernah diunggah.',
    icon: IconCamera,
    tag: 'Disarankan',
  },
  { value: 'timer', title: 'Timer aja', body: 'Tanpa kamera. Istirahat mata dan stretching datang sesuai jadwal.', icon: IconTimer },
  { value: 'demo', title: 'Demo', body: 'Pakai slider, bukan kamera. Buat lihat gimana semuanya bereaksi.', icon: IconSliders },
];

const STEPS = ['Cara ngecek', 'Jam tidur', 'Jadwal jeda'];

export default function Onboarding({ prefs }: { prefs: Prefs }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Prefs>({ ...prefs, mode: 'camera' });
  const set = (p: Partial<Prefs>) => setDraft({ ...draft, ...p });
  const finish = (p: Prefs) => prefsStore.set({ ...p, onboarded: true });
  const last = step === STEPS.length - 1;

  return (
    <section aria-labelledby="setup-title" className="grid items-start gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12">
      <div className="card relative hidden overflow-hidden bg-surface lg:block">
        <div className="aspect-[1150/1180]">
          <PostureFigure posture={null} who={draft.figure} />
        </div>
        <div className="card absolute bottom-4 left-4 flex items-center gap-4 py-2 pr-2 pl-4">
          <span className="text-sm font-semibold">Pilih figurmu</span>
          <CastPicker value={draft.figure} onChange={(figure) => set({ figure })} size="size-10" />
        </div>
        <div className="card absolute top-4 right-4 w-[30%] p-1.5">
          <div className="relative aspect-[560/760] rounded-xl bg-surface">
            <FrontFigure posture={null} who={draft.figure} />
            <span className="chip absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[11px]">Depan</span>
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <ol className="flex items-center gap-2" aria-label="Langkah pengaturan">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  i < step ? 'bg-accent text-on-accent' : i === step ? 'bg-accent-soft text-accent ring-2 ring-accent' : 'bg-surface text-muted'
                }`}
              >
                {i < step ? <IconCheck className="size-3.5" /> : i + 1}
              </span>
              <span className={`hidden text-[13px] sm:inline ${i === step ? 'font-semibold' : 'text-muted'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-rule" aria-hidden />}
            </li>
          ))}
        </ol>

        <div className="enter mt-8" key={step}>
          {step === 0 && (
            <>
              <h1 id="setup-title" className="text-2xl sm:text-3xl">
                Niskala ngecek kamu pakai apa?
              </h1>
              <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Cara ngecek">
                {MODES.map((m) => (
                  <label
                    key={m.value}
                    className="flex cursor-pointer gap-4 rounded-2xl border border-rule bg-raised p-4 transition-colors hover:border-edge has-checked:border-accent has-checked:bg-accent-soft/40 has-checked:shadow-[inset_0_0_0_1px_var(--accent)] has-focus-visible:outline-2 has-focus-visible:outline-accent"
                  >
                    <input type="radio" name="mode" className="sr-only" checked={draft.mode === m.value} onChange={() => set({ mode: m.value })} />
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-accent">
                      <m.icon />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {m.title}
                        {m.tag && <span className="badge badge-accent">{m.tag}</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted text-pretty">{m.body}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 id="setup-title" className="text-2xl sm:text-3xl">
                Biasanya tidur jam berapa?
              </h1>
              <label className="mt-6 block">
                <span className="label block">Jam tidur</span>
                <input
                  type="time"
                  value={hhmm(draft.bedtime)}
                  onChange={(e) => {
                    const m = parseHhmm(e.target.value);
                    if (m !== null) set({ bedtime: m });
                  }}
                  className="field mt-1 text-xl"
                />
              </label>
              <div className="mt-5 flex gap-3 rounded-xl bg-surface p-4 text-sm">
                <IconMoon className="mt-0.5 size-4 shrink-0 text-accent" />
                <p className="text-muted text-pretty">
                  Dua jam sebelumnya, layar Niskala mulai hangat dan kamu diingetin buat beresin kerjaan, bukan mulai yang baru.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 id="setup-title" className="text-2xl sm:text-3xl">
                Seberapa sering mau jeda?
              </h1>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="label mb-2">Istirahat mata 20 detik (aturan 20-20-20)</p>
                  <Segmented
                    label="Istirahat mata"
                    value={draft.eyeMin}
                    options={[
                      { value: 20, label: 'Tiap 20 mnt' },
                      { value: 30, label: '30 mnt' },
                      { value: 0, label: 'Mati' },
                    ]}
                    onChange={(eyeMin) => set({ eyeMin })}
                  />
                </div>
                <div>
                  <p className="label mb-2">Stretching 60 detik</p>
                  <Segmented
                    label="Stretching"
                    value={draft.resetMin}
                    options={[
                      { value: 30, label: '30 mnt' },
                      { value: 50, label: '50 mnt' },
                      { value: 60, label: '60 mnt' },
                      { value: 0, label: 'Mati' },
                    ]}
                    onChange={(resetMin) => set({ resetMin })}
                  />
                </div>
                <Switch
                  checked={draft.sound}
                  onChange={(sound) => set({ sound })}
                  label="Bunyi pelan pas jeda datang"
                  description="Dua nada pendek, kayak bonang kecil."
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep(step - 1)}>
              Balik
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => (last ? finish(draft) : setStep(step + 1))}>
            {last ? 'Buka ruang kerja' : 'Lanjut'}
            <IconArrowRight className="size-4" />
          </button>
          <button type="button" className="btn btn-ghost ml-auto" onClick={() => finish(prefs)}>
            Lewati
          </button>
        </div>
      </div>
    </section>
  );
}
