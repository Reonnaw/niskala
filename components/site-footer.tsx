import Link from 'next/link';
import { Logo } from './logo';

const LINKS = [
  { href: '/app', label: 'Ruang Kerja' },
  { href: '/riwayat', label: 'Riwayat' },
  { href: '/#cara-kerja', label: 'Cara kerja' },
  { href: '/privasi', label: 'Privasi' },
];

export default function SiteFooter() {
  return (
    <footer className="bg-surface/50">
      {/* The five dyes, edge to edge, like the selvage of a batik cloth. */}
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-[3] bg-accent" />
        <span className="flex-1 bg-daun" />
        <span className="flex-1 bg-kunyit" />
        <span className="flex-1 bg-mengkudu" />
        <span className="flex-1 bg-ungu" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-5 px-4 py-10 sm:px-8">
        <Link href="/" aria-label="Beranda Niskala" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Tautan bawah" className="flex flex-wrap gap-x-6 gap-y-2 font-medium">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
