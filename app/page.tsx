import Image from 'next/image';
import Link from 'next/link';
import { IconArrowRight, IconCamera, IconCheck, IconLock, IconPip, IconShield } from '@/components/icons';
import { CastFrame } from '@/components/cast';
import Hero from '@/components/hero';
import SiteFooter from '@/components/site-footer';
import Story from '@/components/story';
import { ROUTINES } from '@/lib/routines';

const CAMERAS = [
  {
    title: 'Kamera depan',
    where: 'Webcam laptop di atas layar udah cukup.',
    reads: ['Bungkuk ke depan', 'Miring ke samping', 'Kepala miring', 'Kedipan'],
    misses: [] as string[],
    front: true,
    who: 'ayu' as const,
    hue: 'hue-daun',
  },
  {
    title: 'Kamera samping',
    where: 'Webcam USB atau HP, setinggi bahu di samping meja. Dari situ leher dan punggung kebaca langsung, kayak fisioterapis ngecek postur.',
    reads: ['Sudut leher, lebih akurat', 'Sudut punggung, lebih akurat'],
    misses: ['Miring ke samping', 'Kedipan'],
    front: false,
    who: 'raka' as const,
    hue: 'hue-nila',
  },
];

const STAYS = [
  'Gambar dari kamera, dicek di tab lalu langsung dibuang',
  'Titik wajah, titik badan, dan waktu kedip',
  'Posisi tegakmu waktu kalibrasi',
  'Semua setelan dan ringkasan sesi, kecuali kamu nyalain cadangan',
  'Bahkan modelnya diambil dari situs ini, bukan CDN',
];
const CAN_LEAVE = [
  'Ringkasan sesi yang dibulatkan: menit aktif, menit bungkuk, jeda, rata-rata kedip',
  'Setelan: jam tidur, layar hangat, jadwal jeda, kepekaan',
  'Cuma setelah kamu nyalain “Cadangkan ringkasan”, pakai ID anonim',
];

export default function Home() {
  const reset = ROUTINES.reset;
  return (
    <>
      <main className="overflow-x-clip">
        <Hero />

        <section id="cara-kerja" className="band motif-kawung">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
            <h2 className="max-w-2xl text-3xl sm:text-[2.6rem] sm:leading-tight">Enam hal yang dicek, dan cara Niskala ngingetin kamu.</h2>
            <Story />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
          <h2 className="max-w-2xl text-3xl sm:text-[2.6rem] sm:leading-tight">Kamera depan atau samping, dua-duanya bisa.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {CAMERAS.map((c) => (
              <article key={c.title} className={`card ${c.hue} grid overflow-hidden sm:grid-cols-[11rem_1fr]`}>
                <div className="stage stage-hue grid place-items-center border-b border-rule p-3 sm:border-r sm:border-b-0">
                  <div className={c.front ? 'h-44 sm:h-full' : 'h-44 w-full sm:h-auto'}>
                    <CastFrame who={c.who} view={c.front ? 'front' : 'side'} amount={c.front ? 0 : 0.35} alt="" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="flex items-center gap-2 text-xl">
                    <IconCamera className="size-5 text-hue" />
                    {c.title}
                  </h3>
                  <ul className="mt-4 space-y-2">
                    {c.reads.map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded-full bg-daun-soft text-daun-ink">
                          <IconCheck className="size-3" />
                        </span>
                        {r}
                      </li>
                    ))}
                    {c.misses.map((r) => (
                      <li key={r} className="flex items-center gap-2 text-muted line-through decoration-edge">
                        <span className="grid size-5 place-items-center rounded-full bg-surface">
                          <span className="h-0.5 w-2 rounded-full bg-edge" />
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-rule pt-4 text-pretty">{c.where}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="hue-daun border-y border-rule bg-hue-soft">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2 className="text-3xl sm:text-[2.6rem] sm:leading-tight">Semenit buat nebus sejam duduk.</h2>
              <Link href="/app" className="btn mt-8">
                Coba stretching-nya
                <IconArrowRight className="size-4" />
              </Link>
            </div>
            <ol className="relative space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[1.4rem] before:w-px before:bg-hue/30">
              {reset.steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-5">
                  <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-hue text-base font-extrabold text-on-accent ring-4 ring-hue-soft">
                    {i + 1}
                  </span>
                  <div className="card flex-1 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="mr-auto text-lg">{s.title}</h3>
                      {s.check && (
                        <span className="badge bg-hue-soft text-hue-ink">
                          <IconCamera className="size-3.5" />
                          dicek kamera
                        </span>
                      )}
                      <span className="badge badge-neutral">{s.seconds} dtk</span>
                    </div>
                    <p className="mt-1 text-muted text-pretty">{s.how}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privasi" className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2 className="text-3xl sm:text-[2.6rem] sm:leading-tight">Video kameramu nggak pernah keluar dari tab.</h2>
              <Link href="/privasi" className="btn mt-8">
                Baca soal privasi
              </Link>
              <Image src="/3d/padlock.webp" alt="" width={316} height={460} unoptimized className="mt-12 hidden h-44 w-auto -rotate-6 drop-shadow-xl lg:block" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="card hue-daun p-6">
                <h3 className="flex items-center gap-2 text-lg">
                  <IconLock className="size-5 text-hue" />
                  Tetap di perangkatmu
                </h3>
                <ul className="mt-4 space-y-3">
                  {STAYS.map((x) => (
                    <li key={x} className="flex gap-3">
                      <IconCheck className="mt-0.5 size-4 shrink-0 text-hue" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card hue-kunyit p-6">
                <h3 className="flex items-center gap-2 text-lg">
                  <IconShield className="size-5 text-hue-ink" />
                  Keluar cuma kalau kamu izinkan
                </h3>
                <ul className="mt-4 space-y-3">
                  {CAN_LEAVE.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-hue" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card hue-ungu flex gap-4 p-6 sm:col-span-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hue-soft text-hue-ink">
                  <IconPip />
                </span>
                <p className="text-pretty">
                  Punya dua monitor? <span className="font-semibold">Jendela kecil</span> Niskala bisa kamu seret ke layar tempat kamu kerja,
                  dan notifikasi desktop jadi cadangannya. Tetap nggak ada yang dikirim.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="band motif-kawung">
          <div className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-8 px-4 py-20 sm:px-8 sm:py-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex items-center gap-6 sm:gap-8">
              <span className="grid size-28 shrink-0 place-items-center rounded-full bg-on-band shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)] sm:size-36">
                <span className="kawung-turn size-24 sm:size-32" aria-hidden />
              </span>
              <h2 className="text-4xl sm:text-5xl">
                <span className="text-on-band-muted">Sekala,</span> niskala.
              </h2>
            </div>
            <div className="space-y-4 text-lg text-pretty">
              <p>
                Di Bali, <em>sekala</em> itu dunia yang kelihatan dan bisa disentuh. <em>Niskala</em> yang nggak kelihatan, tapi tetap
                ngebentuk semuanya.
              </p>
              <p className="text-on-band-muted">
                Kerja di depan layar juga punya sisi yang nggak kelihatan: punggung yang pelan-pelan bungkuk, mata yang lupa ngedip,
                sejam yang tahu-tahu jadi tiga jam. Niskala bikin sisi itu kelihatan, terus minggir.
              </p>
              <Link href="/app" className="btn btn-lg mt-4 border-band-accent bg-band-accent text-[#1c2643] hover:border-on-band hover:bg-on-band">
                Mulai sekarang, gratis
                <IconArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
