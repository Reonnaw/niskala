import Image from 'next/image';
import Link from 'next/link';
import { IconArrowRight, IconCamera, IconCheck, IconHistory, IconLock, IconPip, IconShield, IconSun, IconWorkspace } from '@/components/icons';
import { Drift, Stars } from '@/components/ambient';
import { CastFrame } from '@/components/cast';
import Hero from '@/components/hero';
import { LogoMark } from '@/components/logo';
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

const WHY = [
  {
    icon: IconWorkspace,
    hue: 'hue-nila',
    title: 'Nemenin pas kerja',
    body: 'Nggak nunggu kamu udah drop baru dibuka. Kerja dalam blok fokus 25 atau 50 menit, dan Niskala ngajak jeda sebelum capeknya numpuk.',
  },
  {
    icon: IconHistory,
    hue: 'hue-daun',
    title: 'Buktinya dari datamu sendiri',
    body: 'Riwayat ngebandingin stres dan blok fokusmu di hari yang cukup jeda sama yang nggak. Polanya punyamu, bukan rata-rata orang lain.',
  },
  {
    icon: IconSun,
    hue: 'hue-kunyit',
    title: 'Pengingat yang nggak nambah stres',
    body: 'Nggak ada pop-up atau alarm. Cuma pinggir layar yang nyala pelan, terus padam lagi begitu kamu balik tegak.',
  },
  {
    icon: IconShield,
    hue: 'hue-mengkudu',
    title: 'Nggak nebak emosi dari wajahmu',
    body: 'Kamera cuma baca sudut badan dan kedipan. Soal stres, Niskala percaya sama yang kamu isi sendiri.',
  },
];

const STAYS = [
  'Gambar dari kamera, dicek di tab lalu langsung dibuang',
  'Titik wajah, titik badan, dan waktu kedip',
  'Posisi tegakmu waktu kalibrasi',
  'Semua setelan dan ringkasan sesi, kecuali kamu nyalain cadangan',
  'Cek stres, pegal, dan kabar mingguan, karena UU PDP ngegolongin data kesehatan sebagai data sensitif',
  'Bahkan modelnya diambil dari situs ini, bukan CDN',
];
const CAN_LEAVE = [
  'Ringkasan sesi yang dibulatkan: menit aktif, menit bungkuk, jeda, blok fokus, rata-rata kedip',
  'Setelan: jam tidur, layar hangat, jadwal jeda, kepekaan',
  'Rata-rata stres dan pegal seminggu yang dibulatkan, cuma pas kamu minta saran coach',
  'Cuma setelah kamu nyalain “Cadangkan ringkasan”, pakai ID anonim',
];

export default function Home() {
  const reset = ROUTINES.reset;
  return (
    <>
      <main className="overflow-x-clip">
        <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl content-center items-center gap-x-12 gap-y-8 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <Drift
            spots={[
              { top: '6%', left: '-4%', size: '24rem', turn: 150, float: 17 },
              { top: '70%', left: '30%', size: '10rem', turn: 110, float: 13 },
            ]}
          />
          <div>
            <h1 className="text-[2.8rem] leading-[1.02] font-extrabold sm:text-7xl lg:text-[5.2rem]">
              Stres nggak kelihatan. <span className="marker">Bungkukmu</span> kelihatan.
            </h1>
            <Link href="/app" className="btn btn-primary btn-lg mt-10">
              Mulai sekarang
              <IconArrowRight className="size-4" />
            </Link>
          </div>
          {/* Sekala above, niskala below: the room you can see, standing on what it hides. */}
          <figure className="iso-float relative isolate justify-self-center">
            <div aria-hidden className="absolute -inset-x-16 -inset-y-10 -z-10 bg-[radial-gradient(closest-side_at_50%_40%,color-mix(in_oklab,var(--kunyit)_30%,transparent),transparent)]" />
            <div aria-hidden className="iso-glow absolute top-[93%] left-1/2 -z-10 aspect-square w-[45%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--kunyit)_70%,transparent),transparent)]" />
            <Image
              src="/3d/iso.webp"
              alt="Ruang kerja yang melayang: Raka kerja di meja, Ayu stretching. Di bawah lantainya, garis kunyit turun lewat lapisan warna batik ke logo kawung yang nyala."
              width={1162}
              height={1613}
              unoptimized
              priority
              className="h-auto max-h-[62svh] w-auto lg:max-h-[min(80svh,52rem)]"
            />
          </figure>
        </section>

        <Hero />

        <section className="hue-ungu border-y border-rule bg-hue-soft">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <h2 className="text-3xl sm:text-[2.6rem] sm:leading-tight">
              <span className="text-hue-ink">16%</span> orang dewasa usia kerja punya gangguan mental. Depresi dan kecemasan aja bikin{' '}
              <span className="text-hue-ink">12 miliar</span> hari kerja hilang tiap tahun.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {WHY.map((w) => (
                <article key={w.title} className={`card ${w.hue} p-5`}>
                  <h3 className="flex items-center gap-3 text-lg">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hue-soft text-hue-ink">
                      <w.icon className="size-5" />
                    </span>
                    {w.title}
                  </h3>
                  <p className="mt-3 text-muted text-pretty">{w.body}</p>
                </article>
              ))}
              <article className="card flex items-center gap-5 p-5 sm:col-span-2">
                <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-hue-soft text-accent">
                  <LogoMark className="breathe size-14" />
                </span>
                <div>
                  <h3 className="text-lg">Jeda napas 1 menit</h3>
                  <p className="mt-1 text-muted text-pretty">
                    Tarik napas pas kawungnya membesar, buang pas dia mengecil, dipandu suara. Jadi salah satu misi harian.
                  </p>
                </div>
              </article>
              <p className="text-sm text-muted sm:col-span-2">
                Sumber:{' '}
                <a href="https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work" className="link">
                  WHO, Mental health at work
                </a>
                , perkiraan global. Angka 16% itu data tahun 2023.
              </p>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
          <Drift spots={[{ top: '-8%', right: '-2%', size: '22rem', turn: 160, float: 19 }]} />
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

        <section id="privasi" className="relative mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
          <Drift
            spots={[
              { top: '46%', left: '-6%', size: '20rem', turn: 140, float: 15 },
              { top: '6%', left: '30%', size: '9rem', turn: 100, float: 12 },
            ]}
          />
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <h2 className="text-3xl sm:text-[2.6rem] sm:leading-tight">Video kameramu nggak pernah keluar dari tab.</h2>
              <Link href="/privasi" className="btn mt-8">
                Baca soal privasi
              </Link>
            </div>
            <div className="relative grid gap-5 sm:grid-cols-2">
              <Image
                src="/3d/padlock.webp"
                alt=""
                width={316}
                height={460}
                unoptimized
                className="absolute -top-14 -right-5 z-10 hidden h-32 w-auto rotate-12 drop-shadow-xl sm:block"
              />
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

        <Story />

        <section className="band relative overflow-hidden">
          <Stars className="inset-y-0 opacity-70" />
          {/* One kawung at the scale of the room instead of a tiled wallpaper: four petals that also read as eyes. */}
          <svg
            aria-hidden
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            className="pointer-events-none absolute top-1/2 -right-56 size-[46rem] -translate-y-1/2 text-on-band opacity-[0.07] max-md:hidden"
          >
            <ellipse cx="24" cy="11" rx="6.5" ry="11" />
            <ellipse cx="24" cy="37" rx="6.5" ry="11" />
            <ellipse cx="11" cy="24" rx="11" ry="6.5" />
            <ellipse cx="37" cy="24" rx="11" ry="6.5" />
            <circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none" />
          </svg>
          <div className="relative mx-auto grid max-w-6xl items-center gap-x-16 gap-y-8 px-4 py-20 sm:px-8 sm:py-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
                Kerja di depan layar juga punya sisi yang nggak kelihatan: stres yang numpuk pelan-pelan. Yang kelihatan cuma tandanya,
                punggung yang makin bungkuk, mata yang lupa ngedip, jeda yang terus dilewatin. Niskala baca tanda itu, ngajak kamu jeda,
                terus minggir.
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
