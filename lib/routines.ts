// Plain data so both server pages and client components can read it.
// Breaks come due on a schedule; training is only ever started by hand.
export type BreakKind = 'reset' | 'eye';
export type RoutineKind = BreakKind | 'train';

/** Looping 3D clips of each move, rendered by assets/story/exercises.py into public/exercise/<figure>/<name>.webp. */
export type Exercise = 'sit-tall' | 'chin-tuck' | 'squeeze' | 'work' | 'shoulder-roll' | 'neck-tilt' | 'look-far';

export type Step = {
  title: string;
  visual: Exercise;
  how: string;
  seconds: number;
  cues: string[];
  /** Live camera feedback shown during the step. */
  check?: 'head' | 'tilt' | 'blinks' | 'upright';
};

export const ROUTINES: Record<RoutineKind, { title: string; short: string; steps: Step[] }> = {
  reset: {
    title: 'Stretching 60 detik',
    short: 'Stretching',
    steps: [
      {
        title: 'Tarik dagu',
        visual: 'chin-tuck',
        how: 'Pandangan tetap lurus, tarik dagu ke belakang kayak lagi bikin dagu dobel.',
        seconds: 15,
        cues: ['Tarik dagu, tahan', 'Lepas', 'Tarik dagu, tahan', 'Lepas', 'Tarik dagu, tahan', 'Lepas'],
        check: 'head',
      },
      {
        title: 'Putar bahu',
        visual: 'shoulder-roll',
        how: 'Pelan-pelan: angkat ke telinga, tarik ke belakang, terus turunin.',
        seconds: 15,
        cues: ['Naik', 'Ke belakang', 'Turun', 'Naik', 'Ke belakang', 'Turun', 'Naik', 'Ke belakang', 'Turun'],
      },
      {
        title: 'Leher ke samping',
        visual: 'neck-tilt',
        how: 'Bahu tetap turun. Biarin kepala miring sendiri karena beratnya.',
        seconds: 15,
        cues: ['Telinga kiri ke bahu kiri', 'Telinga kanan ke bahu kanan'],
        check: 'tilt',
      },
      {
        title: 'Lihat jauh, kedip penuh',
        visual: 'look-far',
        how: 'Lihat benda paling jauh yang kelihatan, kalau bisa 6 meter lebih. Tiap kedip, merem penuh.',
        seconds: 15,
        cues: ['Lihat jauh', 'Kedip penuh, pelan', 'Lihat jauh', 'Kedip penuh, pelan'],
        check: 'blinks',
      },
    ],
  },
  train: {
    title: 'Latihan postur 2 menit',
    short: 'Latihan postur',
    steps: [
      {
        title: 'Duduk tegak',
        visual: 'sit-tall',
        how: 'Telapak kaki rata di lantai, pinggul mundur sampai nempel sandaran, bahu turun dan santai.',
        seconds: 30,
        cues: ['Duduk tegak', 'Bahu turun', 'Tahan', 'Napas pelan'],
        check: 'upright',
      },
      {
        title: 'Tarik dagu',
        visual: 'chin-tuck',
        how: 'Pandangan tetap lurus. Tarik dagu ke belakang sampai telinga sejajar bahu, tahan lima detik.',
        seconds: 30,
        cues: ['Tarik dagu, tahan', 'Lepas', 'Tarik dagu, tahan', 'Lepas', 'Tarik dagu, tahan', 'Lepas'],
        check: 'head',
      },
      {
        title: 'Rapatkan belikat',
        visual: 'squeeze',
        how: 'Tarik kedua bahu ke belakang dan ke bawah, kayak lagi ngejepit pensil di antara tulang belikat.',
        seconds: 30,
        cues: ['Rapatkan, tahan', 'Lepas', 'Rapatkan, tahan', 'Lepas', 'Rapatkan, tahan', 'Lepas'],
        check: 'upright',
      },
      {
        title: 'Tahan sambil kerja',
        visual: 'work',
        how: 'Balik ngetik atau baca, tapi jaga posisi tadi. Kamera ngitung berapa lama kamu tetap tegak.',
        seconds: 30,
        cues: ['Balik kerja, tetap tegak', 'Bagus, terus', 'Dikit lagi'],
        check: 'upright',
      },
    ],
  },
  eye: {
    title: 'Istirahat mata 20 detik',
    short: 'Istirahat mata',
    steps: [
      {
        title: 'Lihat yang jauh',
        visual: 'look-far',
        how: 'Ke luar jendela kalau bisa. Santaiin mata, terus kedip penuh beberapa kali.',
        seconds: 20,
        cues: ['Lihat jauh', 'Terus lihat jauh', 'Kedip penuh, pelan', 'Dikit lagi'],
        check: 'blinks',
      },
    ],
  },
};
