import type { Metadata } from 'next';
import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { IconCamera, IconEye, IconHistory, IconInfo, IconLock, IconShield } from '@/components/icons';
import SiteFooter from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Privasi',
  description: 'Apa yang dicek Niskala, apa yang disimpan, dan apa yang bisa keluar dari perangkatmu.',
};

function Block({ icon: Icon, title, children }: { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; children: ReactNode }) {
  return (
    <section className="card grid gap-4 p-6 sm:grid-cols-[2.5rem_1fr]">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon />
      </span>
      <div>
        <h2 className="text-lg">{title}</h2>
        <div className="mt-2 space-y-3 text-pretty text-muted [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <header className="band motif-kawung">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8 sm:py-20">
          <h1 className="text-3xl sm:text-5xl sm:leading-tight">Kameranya bantu, tapi nggak ada yang ikut nonton.</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-8">
        <div className="-mt-8 space-y-4">
          <Block icon={IconCamera} title="Kamera">
            <p>
              Kamera cuma nyala pas kamu tekan <strong>Nyalain kamera</strong>, dan mati pas kamu tekan Matikan, ganti mode, atau
              nutup tab. Tiap gambar dicek model wajah atau badan yang jalan di browsermu, terus dibuang.{' '}
              <strong>Nggak ada gambar, video, atau titik wajah yang diunggah atau disimpan.</strong>
            </p>
            <p>Model dan runtime-nya diambil dari situs ini sendiri, jadi nggak ada server pihak ketiga yang dihubungi.</p>
          </Block>
          <Block icon={IconEye} title="Yang ada di memori">
            <p>
              Selama ngecek, Niskala nyimpen beberapa angka per gambar. Dari kamera depan: sudut kepala, miringnya garis mata, jarak
              antar mata di gambar, posisi wajah, dan lagi merem atau nggak. Dari kamera samping: sudut leher dan sudut punggung.
              Angka ini dipakai buat tampilan langsung dan hilang begitu kamu ninggalin halaman.
            </p>
          </Block>
          <Block icon={IconShield} title="Nggak nebak perasaanmu dari wajah">
            <p>
              Niskala sengaja nggak nebak emosi atau stres dari ekspresi wajahmu. Kamera cuma dipakai buat sudut kepala dan badan, plus
              kedipan. <strong>Angka stres cuma datang dari yang kamu isi sendiri.</strong>
            </p>
          </Block>
          <Block icon={IconHistory} title="Yang kesimpan di browsermu">
            <p>
              Di local storage browser ini: <strong>setelan</strong>, <strong>kalibrasi</strong> (beberapa angka soal posisi tegakmu,
              buat kamera depan dan samping), <strong>ringkasan sesi</strong> (menit aktif, menit bungkuk, jeda yang diambil, blok fokus,
              rata-rata kedip), dan yang kamu isi sendiri: <strong>cek pegal dan stres</strong> tiap hari dan <strong>kabar mingguan</strong>{' '}
              (kuesioner WHO-5). Semua itu jadi bahan halaman Riwayat. Cek harian dan kabar mingguan itu data kesehatan, yang di UU PDP
              (UU No. 27 Tahun 2022) masuk data pribadi spesifik, jadi nggak pernah ikut dicadangkan. Kalau kamu minta saran coach, yang
              dikirim cuma rata-rata pegal dan stres seminggu yang dibulatkan. Jawaban kabar mingguan nggak pernah dikirim ke mana-mana.
            </p>
            <p>
              Kamu bisa unduh atau hapus semuanya dari tab Setelan di{' '}
              <Link href="/app" className="link text-ink">
                ruang kerja
              </Link>
              .
            </p>
          </Block>
          <Block icon={IconLock} title="Cadangan, kalau kamu mau">
            <p>
              Kalau situs ini disambungin ke layanan cadangan, ruang kerja nampilin sakelar <strong>Cadangkan ringkasan</strong>.
              Awalnya mati. Kalau dinyalain, ringkasan sesi dan setelan (jam tidur, layar hangat, jadwal jeda, kepekaan) dikirim ke
              database Supabase pakai ID anonim, dengan aturan yang cuma ngizinin ID itu baca datanya sendiri. Kalibrasimu nggak
              pernah dikirim.
            </p>
          </Block>
          <Block icon={IconLock} title="Coach mingguan, kalau kamu minta">
            <p>
              Tombol <strong>Minta saran coach</strong> di Riwayat ngirim angka ringkasan 7 hari terakhir ke server situs ini: menit di
              depan layar, persen waktu bungkuk dan jarang kedip, jumlah jeda, skor harian, rata-rata pegal dan stres, semuanya
              dibulatkan. Server nerusin angka itu ke Gemini (Google) buat nyusun tiga saran, lalu nggak nyimpan apa-apa. Video, titik
              wajah, dan sesi mentahmu nggak ikut, dan kamu bisa lihat persis yang dikirim sebelum nekan tombolnya.
            </p>
          </Block>
          <Block icon={IconShield} title="Kamu nggak dilacak">
            <p>Nggak ada analitik, skrip iklan, cookie, atau akun di situs ini.</p>
            <p>
              Situs ini juga minta browser ngunci beberapa hal: cuma Niskala sendiri yang boleh minta akses kamera, mikrofon dan lokasi
              nggak bisa diminta sama sekali, situs lain nggak bisa nampilin Niskala di dalam halamannya, dan alamat halaman ini nggak
              ikut kekirim pas kamu buka tautan keluar.
            </p>
          </Block>
          <Block icon={IconInfo} title="Bukan saran medis">
            <p>
              Niskala cuma ngasih pengingat ergonomi, jeda, dan kebiasaan tidur yang umum. Ini bukan alat medis, dan skor kabar mingguan
              bukan penilaian kondisi mentalmu. Kalau leher, punggung, atau matamu terus sakit, periksa ke tenaga kesehatan. Kalau lagi
              berat, kamu bisa ngobrol sama Healing119 dari Kemenkes: telepon 119 ext 8, gratis, 24 jam.
            </p>
          </Block>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
