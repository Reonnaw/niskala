'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { minutes } from '@/lib/format';
import { weekSummary, type Week } from '@/lib/coach';
import { GOAL, byDay, dayKey, dayScore, enoughBreaks, focusByBreaks, missions, painAverages, painByScore, painOf, streak, stressByBreaks, totals, type Day } from '@/lib/insights';
import { sampleData } from '@/lib/sample';
import { checkinsStore, clearSample, coachStore, exportData, loadSample, sampleStore, sessionsStore, type Checkin } from '@/lib/store';
import { toast } from '@/lib/toast';
import { IconArrowRight, IconCheck, IconDownload, IconEye, IconGauge, IconHistory, IconInfo, IconMoon, IconPosture, IconStretch, IconTimer } from './icons';
import { Stat } from './ui';
import { Segmented } from './ui-client';

const noop = () => () => {};
const RANGES = [7, 14, 30] as const;
const SOURCE: Record<string, string> = { camera: 'Kamera', timer: 'Timer', simulation: 'Demo' };

const dayLabel = (d: Date) => d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
  a.download = 'niskala-data.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Data kesimpan sebagai niskala-data.json.');
}

function Chart({ days }: { days: Day[] }) {
  // Round the top up to the next half hour so the axis reads "3 j" and "1 j 30 mnt", not "2 j 58 mnt".
  const max = Math.ceil(Math.max(...days.map((d) => d.active_s), 1) / 1800) * 1800;
  const every = days.length > 14 ? 5 : 1;
  return (
    <figure className="card p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="font-bold">Waktu di layar per hari, dan berapa lama kamu bungkuk atau miring</p>
        <div className="flex gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-accent" /> tegak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-alert" /> bungkuk / miring
          </span>
        </div>
      </figcaption>
      <div className="mt-6 flex gap-3">
        <div className="flex h-52 flex-col justify-between text-right text-[11px] text-muted tabular-nums" aria-hidden>
          <span>{minutes(max)}</span>
          <span>{minutes(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-52 border-t border-dashed border-rule" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-26 border-t border-dashed border-rule" aria-hidden />
          <ol className="relative flex h-52 items-end gap-[3px] border-b border-edge sm:gap-1.5" aria-hidden>
            {days.map((d) => {
              const h = (d.active_s / max) * 100;
              const lean = d.active_s ? (d.slouch_s / d.active_s) * 100 : 0;
              const score = dayScore(d);
              const ms = missions(d);
              return (
                <li
                  key={d.key}
                  className="group flex h-full flex-1 flex-col justify-end"
                  title={`${dayLabel(d.date)}: ${minutes(d.active_s)}, ${pct(d.slouch_s, d.active_s)}% bungkuk${score === null ? '' : `, skor ${score}`}, misi ${ms.filter((m) => m.done).length}/${ms.length}`}
                >
                  <div className="flex flex-col overflow-hidden rounded-t-md transition-opacity group-hover:opacity-80" style={{ height: `${h}%` }}>
                    <div className="flex-1 bg-accent" />
                    <div className="bg-alert" style={{ height: `${lean}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <ol className="mt-2 flex gap-[3px] text-center text-[11px] text-muted tabular-nums sm:gap-1.5" aria-hidden>
            {days.map((d, i) => (
              <li key={d.key} className="flex-1">
                {(days.length - 1 - i) % every === 0 ? d.date.getDate() : ''}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="sr-only">
        <table>
          <caption>Waktu di layar dan waktu bungkuk per hari</caption>
          <thead>
            <tr>
              <th>Hari</th>
              <th>Waktu di layar</th>
              <th>Bungkuk atau miring</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.key}>
                <td>{dayLabel(d.date)}</td>
                <td>{minutes(d.active_s)}</td>
                <td>{minutes(d.slouch_s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const one = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 });

/** One cell per day, tinted by a value from 0 to `max` (more tints as `max`) with the number inside, and the day of the month under it. */
function DayStrip({ days, value, color, title, ring, max = 10 }: {
  days: Day[];
  value: (d: Day) => number | undefined;
  color: string;
  title: (d: Day) => string;
  ring?: (d: Day) => boolean;
  max?: number;
}) {
  // Numbers fit a cell at 7 days on a phone and at 14 on wider screens; past that the tooltip and table carry them.
  const numbers = days.length <= 7 ? '' : days.length <= 14 ? 'max-sm:hidden' : 'hidden';
  const every = days.length > 14 ? 5 : 1;
  return (
    <>
      <ol className="mt-5 flex gap-[3px] sm:gap-1.5" aria-hidden>
        {days.map((d) => {
          const v = value(d);
          return (
            <li
              key={d.key}
              className={`grid aspect-square max-h-14 flex-1 place-items-center rounded-md text-sm font-bold tabular-nums ${v === undefined ? 'border border-dashed border-edge/40' : ''} ${ring?.(d) ? 'ring-2 ring-daun ring-inset' : ''}`}
              // One hue from faint to strong; the number inside carries the value too. Capped so the ink stays readable.
              style={v === undefined ? undefined : { background: `color-mix(in oklab, ${color} ${Math.round(8 + Math.min(v / max, 1) * 47)}%, var(--surface))` }}
              title={title(d)}
            >
              {v !== undefined && <span className={numbers}>{one(v)}</span>}
            </li>
          );
        })}
      </ol>
      <ol className="mt-2 flex gap-[3px] text-center text-[11px] text-muted tabular-nums sm:gap-1.5" aria-hidden>
        {days.map((d, i) => (
          <li key={d.key} className="flex-1">
            {(days.length - 1 - i) % every === 0 ? d.date.getDate() : ''}
          </li>
        ))}
      </ol>
    </>
  );
}

/** Self-rated discomfort per day next to the score: the place where better posture can show up as less pain. */
function PainCard({ days, checkins }: { days: Day[]; checkins: Checkin[] }) {
  const byKey = new Map(checkins.map((c) => [c.day, c]));
  const cmp = painByScore(days, checkins);
  const avg = painAverages(days, checkins);

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg">Pegal dan postur</h2>
      {avg.n === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-4">
          <p className="max-w-xl text-muted text-pretty">
            Isi cek pegal di ruang kerja tiap udahan kerja. Setelah beberapa hari, di sini kelihatan apakah hari yang lebih tegak bikin
            badanmu lebih enteng.
          </p>
          <Link href="/app" className="btn btn-sm">
            Isi cek pegal
            <IconArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <DayStrip
            days={days}
            value={(d) => {
              const c = byKey.get(d.key);
              return c && painOf(c);
            }}
            color="var(--mengkudu)"
            title={(d) => {
              const c = byKey.get(d.key);
              const score = dayScore(d);
              return `${dayLabel(d.date)}: ${c ? `leher ${c.neck}, punggung ${c.back}, mata ${c.eyes}` : 'belum diisi'}${score === null ? '' : `, skor ${score}`}`;
            }}
          />
          <div className="mt-5 space-y-2 text-pretty">
            {cmp.ready ? (
              <p>
                Di hari skormu {GOAL} ke atas, pegalmu rata-rata <strong className="tabular-nums">{one(cmp.good.mean!)}</strong>. Di hari lain{' '}
                <strong className="tabular-nums">{one(cmp.low.mean!)}</strong>.{' '}
                {cmp.low.mean! - cmp.good.mean! >= 0.5
                  ? 'Hari yang lebih tegak kelihatan bikin badanmu lebih enteng.'
                  : cmp.good.mean! - cmp.low.mean! >= 0.5
                    ? 'Belum kelihatan bedanya ke arah yang bagus. Coba cek setup meja, atau stretching lebih sering.'
                    : 'Bedanya masih tipis, terus isi biar polanya makin jelas.'}
              </p>
            ) : (
              <p className="text-muted">
                Biar kelihatan polanya, butuh minimal dua hari dengan skor {GOAL} ke atas dan dua hari di bawahnya yang ada cek pegalnya.
                Sekarang {cmp.good.n} dan {cmp.low.n}.
              </p>
            )}
            <p className="text-muted tabular-nums">
              Rata-rata dari {avg.n} hari: leher {one(avg.neck!)} · punggung {one(avg.back!)} · mata {one(avg.eyes!)}
            </p>
          </div>
          <div className="sr-only">
            <table>
              <caption>Pegal per hari, skala 0 sampai 10</caption>
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Leher dan bahu</th>
                  <th>Punggung</th>
                  <th>Mata</th>
                  <th>Skor postur</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const c = byKey.get(d.key);
                  return (
                    <tr key={d.key}>
                      <td>{dayLabel(d.date)}</td>
                      <td>{c?.neck ?? 'belum diisi'}</td>
                      <td>{c?.back ?? 'belum diisi'}</td>
                      <td>{c?.eyes ?? 'belum diisi'}</td>
                      <td>{dayScore(d) ?? 'belum ada'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/** Self-rated stress per day next to the breaks taken: where pausing during work can show up as a lighter head. */
function StressCard({ days, checkins }: { days: Day[]; checkins: Checkin[] }) {
  const stress = new Map(checkins.flatMap((c) => (c.stress === undefined ? [] : [[c.day, c.stress] as const])));
  const cmp = stressByBreaks(days, checkins);
  const rated = days.filter((d) => stress.has(d.key));
  const all = (d: Day) => d.active_s > 0 && enoughBreaks(d);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <h2 className="text-lg">Stres dan jeda</h2>
        {rated.length > 0 && (
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="size-2.5 rounded-sm ring-2 ring-daun ring-inset" /> semua jeda diambil
          </span>
        )}
      </div>
      {rated.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-4">
          <p className="max-w-xl text-muted text-pretty">
            Isi stres di cek harian ruang kerja. Setelah beberapa hari, di sini kelihatan apakah hari yang cukup jeda bikin kepalamu
            lebih ringan.
          </p>
          <Link href="/app" className="btn btn-sm">
            Isi cek harian
            <IconArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <DayStrip
            days={days}
            value={(d) => stress.get(d.key)}
            color="var(--ungu)"
            ring={all}
            title={(d) =>
              `${dayLabel(d.date)}: ${stress.has(d.key) ? `stres ${stress.get(d.key)}` : 'belum diisi'}${d.active_s > 0 ? (all(d) ? ', semua jeda diambil' : ', jeda kurang') : ''}`
            }
          />
          <div className="mt-5 space-y-2 text-pretty">
            {cmp.ready ? (
              <p>
                Di hari kamu ngambil semua jeda (istirahat mata, stretching, jeda napas), stresmu rata-rata{' '}
                <strong className="tabular-nums">{one(cmp.good.mean!)}</strong>. Di hari kerja lain{' '}
                <strong className="tabular-nums">{one(cmp.low.mean!)}</strong>.{' '}
                {cmp.low.mean! - cmp.good.mean! >= 0.5
                  ? 'Jeda kelihatan bikin kepalamu lebih ringan.'
                  : cmp.good.mean! - cmp.low.mean! >= 0.5
                    ? 'Belum kelihatan bedanya ke arah yang bagus. Mungkin ada hal lain yang lagi berat, dan itu wajar.'
                    : 'Bedanya masih tipis, terus isi biar polanya makin jelas.'}
              </p>
            ) : (
              <p className="text-muted">
                Biar kelihatan polanya, butuh minimal dua hari kerja yang semua jedanya diambil dan dua yang nggak, yang ada cek stresnya.
                Sekarang {cmp.good.n} dan {cmp.low.n}.
              </p>
            )}
            <p className="text-muted tabular-nums">
              Rata-rata dari {rated.length} hari: stres {one(rated.reduce((a, d) => a + stress.get(d.key)!, 0) / rated.length)}
            </p>
          </div>
          <div className="sr-only">
            <table>
              <caption>Stres per hari, skala 0 sampai 10</caption>
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Stres</th>
                  <th>Semua jeda diambil</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.key}>
                    <td>{dayLabel(d.date)}</td>
                    <td>{stress.get(d.key) ?? 'belum diisi'}</td>
                    <td>{d.active_s === 0 ? 'nggak kerja' : all(d) ? 'ya' : 'belum'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/** Focus blocks per day next to the breaks: the place where taking every break can show it costs no work. */
function FocusCard({ days }: { days: Day[] }) {
  const cmp = focusByBreaks(days);
  const used = days.filter((d) => d.focus > 0);
  const all = (d: Day) => d.active_s > 0 && enoughBreaks(d);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <h2 className="text-lg">Fokus dan jeda</h2>
        {used.length > 0 && (
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="size-2.5 rounded-sm ring-2 ring-daun ring-inset" /> semua jeda diambil
          </span>
        )}
      </div>
      {used.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-4">
          <p className="max-w-xl text-muted text-pretty">
            Kerja pakai blok fokus 25 atau 50 menit di ruang kerja. Setelah beberapa hari, di sini kelihatan apakah ngambil semua jeda
            bikin kerjaanmu molor atau nggak.
          </p>
          <Link href="/app" className="btn btn-sm">
            Mulai blok fokus
            <IconArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <DayStrip
            days={days}
            value={(d) => d.focus || undefined}
            color="var(--accent)"
            // A day rarely holds more than six blocks; on a 0-10 scale the usual three or four barely tint.
            max={6}
            ring={all}
            title={(d) =>
              `${dayLabel(d.date)}: ${d.focus ? `${d.focus} blok fokus` : 'belum ada blok fokus'}${d.active_s > 0 ? (all(d) ? ', semua jeda diambil' : ', jeda kurang') : ''}`
            }
          />
          <div className="mt-5 space-y-2 text-pretty">
            {cmp.ready ? (
              <p>
                Di hari kamu ngambil semua jeda, kamu nyelesain rata-rata <strong className="tabular-nums">{one(cmp.good.mean!)}</strong> blok
                fokus. Di hari kerja lain <strong className="tabular-nums">{one(cmp.low.mean!)}</strong>.{' '}
                {cmp.good.mean! - cmp.low.mean! > -0.5
                  ? 'Jeda nggak bikin kerjaanmu molor.'
                  : 'Di hari yang jedanya kurang, blokmu lebih banyak. Coba lihat juga stresmu di hari-hari itu.'}
              </p>
            ) : (
              <p className="text-muted">
                Biar kelihatan polanya, butuh minimal dua hari kerja yang semua jedanya diambil dan dua yang nggak. Sekarang {cmp.good.n} dan{' '}
                {cmp.low.n}.
              </p>
            )}
            <p className="text-muted tabular-nums">
              Total {used.reduce((a, d) => a + d.focus, 0)} blok fokus dalam {used.length} hari
            </p>
          </div>
          <div className="sr-only">
            <table>
              <caption>Blok fokus per hari</caption>
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Blok fokus</th>
                  <th>Semua jeda diambil</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.key}>
                    <td>{dayLabel(d.date)}</td>
                    <td>{d.focus}</td>
                    <td>{d.active_s === 0 ? 'nggak kerja' : all(d) ? 'ya' : 'belum'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CoachCard({ week, today }: { week: Week; today: string }) {
  const saved = useSyncExternalStore(coachStore.subscribe, coachStore.get, coachStore.server);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enough = week.trackedMin >= 30;

  async function ask() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(week) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Coach lagi nggak bisa dihubungi.');
      coachStore.set({ day: today, coach: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const coach = saved?.coach;
  return (
    <section className="card space-y-5 p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl">{coach ? coach.headline : 'Coach minggu ini'}</h2>
        <button type="button" className={coach ? 'btn btn-sm' : 'btn btn-primary btn-sm'} onClick={ask} disabled={busy || !enough}>
          {busy ? 'Coach lagi mikir…' : coach ? 'Minta saran baru' : 'Minta saran coach'}
        </button>
      </div>
      {coach ? (
        <ol className="grid gap-3 md:grid-cols-3">
          {coach.tips.map((t, i) => (
            <li key={t.title} className="rounded-xl bg-surface p-4">
              <p className="font-semibold">
                {i + 1}. {t.title}
              </p>
              <p className="mt-1.5 text-sm text-muted text-pretty">{t.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="max-w-2xl text-muted text-pretty">
          {enough
            ? 'Gemini baca ringkasan 7 hari terakhirmu dan ngasih tiga saran yang pas buat kebiasaanmu.'
            : 'Kumpulin minimal 30 menit yang dicek kamera atau demo minggu ini, terus minta saran di sini.'}
        </p>
      )}
      {error && <p className="text-sm text-alert-ink">{error}</p>}
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">
          Yang dikirim cuma angka ringkasan yang dibulatkan{saved && saved.day !== today ? `. Saran di atas dari ${saved.day}` : ''}.
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-surface p-3 text-[12px] leading-relaxed">{JSON.stringify(week, null, 2)}</pre>
      </details>
    </section>
  );
}

export default function HistoryView() {
  const sessions = useSyncExternalStore(sessionsStore.subscribe, sessionsStore.get, sessionsStore.server);
  const checkins = useSyncExternalStore(checkinsStore.subscribe, checkinsStore.get, checkinsStore.server);
  const sample = useSyncExternalStore(sampleStore.subscribe, sampleStore.get, sampleStore.server);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);

  if (!hydrated) return <p className="py-10 text-muted">Ngambil riwayat dari browser ini…</p>;

  const days = byDay(sessions, range, new Date());
  const t = totals(days);
  const active = days.filter((d) => d.active_s >= 600);
  const scores = days.map(dayScore).filter((s) => s !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  // The streak may reach further back than the range on screen.
  const recent = byDay(sessions, 60, new Date());
  const run = streak(recent);
  const best = active.length > 1 ? active.reduce((a, b) => (b.slouch_s / b.active_s < a.slouch_s / a.active_s ? b : a)) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Riwayat {range} hari terakhir</h1>
        <Segmented
          label="Rentang"
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r, label: `${r} hari` }))}
        />
      </div>

      {sample && (
        <div className="hue-kunyit flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-hue-soft px-4 py-3 text-sm">
          <IconInfo className="size-4 shrink-0 text-hue-ink" />
          <p className="min-w-48 flex-1 text-pretty">Ini data contoh buat nyobain Riwayat. Data aslimu kesimpan begitu kamu pakai ruang kerja.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearSample}>
            Hapus data contoh
          </button>
        </div>
      )}

      {t.activeDays === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface text-accent">
            <IconHistory className="size-7" />
          </span>
          <p className="mt-5 max-w-md text-lg text-pretty">
            Belum ada sesi di rentang ini. Sesi di ruang kerja yang lebih dari 30 detik otomatis kesimpan di sini, mode apa pun.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/app" className="btn btn-primary">
              Buka ruang kerja
              <IconArrowRight className="size-4" />
            </Link>
            {/* Two weeks of use before Riwayat says anything is a long wait for someone just trying it out. */}
            {sessions.length === 0 && checkins.length === 0 && (
              <button type="button" className="btn" onClick={() => loadSample(sampleData(new Date()))}>
                Lihat pakai data contoh
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="card grid gap-x-8 px-5 py-1 md:grid-cols-2 [&>*]:border-b [&>*]:border-rule md:[&>*:nth-last-child(-n+2)]:border-b-0 [&>*:last-child]:border-b-0">
            <Stat icon={IconGauge} label="Skor rata-rata" value={avgScore === null ? 'Belum ada' : String(avgScore)} detail={`target ${GOAL}, dari ${scores.length} hari`} />
            <Stat icon={IconCheck} hue="hue-daun" label="Hari beruntun" value={`${run} hari`} detail={`skor ${GOAL} ke atas`} />
            <Stat icon={IconTimer} hue="hue-kunyit" label="Waktu di layar" value={minutes(t.active_s)} detail={`dalam ${t.activeDays} hari`} />
            <Stat icon={IconPosture} label="Bungkuk atau miring" value={`${Math.round(t.leanShare * 100)}%`} detail={minutes(t.slouch_s)} tone={t.leanShare > 0.25 ? 'alert' : undefined} />
            <Stat
              icon={IconStretch}
              hue="hue-mengkudu"
              label="Jeda diambil"
              value={String(t.resets + t.eye_breaks + t.breaths)}
              detail={`${t.resets} stretching, ${t.eye_breaks} mata, ${t.breaths} napas`}
            />
            <Stat icon={IconEye} hue="hue-daun" label="Rata-rata kedip" value={t.blink === null ? 'Belum ada' : `${Math.round(t.blink)}/mnt`} />
            <Stat icon={IconMoon} hue="hue-ungu" label="Lewat jam tidur" value={minutes(t.late_s)} />
            <Stat icon={IconCheck} hue="hue-daun" label="Semua misi beres" value={`${t.missionDays} hari`} detail={`dari ${t.activeDays}`} />
            <Stat icon={IconPosture} label="Latihan postur" value={`${t.trainings} kali`} />
            <Stat icon={IconHistory} label="Disimpan di" value="browser ini" detail="coach cuma dapat ringkasan" />
          </div>

          <Chart days={days} />

          <StressCard days={days} checkins={checkins} />

          <FocusCard days={days} />

          <PainCard days={days} checkins={checkins} />

          <CoachCard week={weekSummary(recent.slice(-7), run, checkins)} today={dayKey(new Date())} />

          {best && (
            <div className="card flex items-center gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <IconPosture />
              </span>
              <p className="text-pretty">
                Hari paling tegakmu: <strong>{dayLabel(best.date)}</strong>, bungkuk cuma {pct(best.slouch_s, best.active_s)}% dari{' '}
                {minutes(best.active_s)}.
              </p>
            </div>
          )}

          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 text-lg">Sesi terbaru</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm tabular-nums">
                <thead className="bg-surface/60 text-[13px] text-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Mulai</th>
                    <th className="py-2.5 pr-4 font-medium">Durasi</th>
                    <th className="py-2.5 pr-4 font-medium">Bungkuk</th>
                    <th className="py-2.5 pr-4 font-medium">Jeda</th>
                    <th className="py-2.5 pr-5 font-medium">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 12).map((s) => (
                    <tr key={s.id} className="border-t border-rule">
                      <td className="px-5 py-3">
                        {new Date(s.started_at).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 pr-4">{minutes(s.active_s)}</td>
                      <td className="py-3 pr-4">
                        <span className={pct(s.slouch_s, s.active_s) > 25 ? 'font-semibold text-alert-ink' : ''}>{pct(s.slouch_s, s.active_s)}%</span>
                      </td>
                      <td className="py-3 pr-4">{s.resets + s.eye_breaks + s.breaths}</td>
                      <td className="py-3 pr-5">
                        <span className="badge badge-neutral">{SOURCE[s.source] ?? s.source}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <button type="button" className="btn btn-sm" onClick={download}>
        <IconDownload className="size-4" />
        Unduh semua data (JSON)
      </button>
    </div>
  );
}
