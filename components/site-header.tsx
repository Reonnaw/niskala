'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconArrowRight, IconClose, IconHistory, IconMenu, IconShield, IconWorkspace } from './icons';
import { Logo } from './logo';
import ThemeToggle from './theme-toggle';

const NAV = [
  { href: '/app', label: 'Ruang Kerja', icon: IconWorkspace },
  { href: '/riwayat', label: 'Riwayat', icon: IconHistory },
  { href: '/privasi', label: 'Privasi', icon: IconShield },
];

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(path);
  // Close the mobile menu after navigating, without an effect.
  if (open && openedAt !== path) {
    setOpen(false);
    setOpenedAt(path);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const link = (n: (typeof NAV)[number], mobile = false) => {
    const active = path === n.href;
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-2 rounded-xl font-medium transition-colors ${
          mobile ? 'px-3 py-3 text-base' : 'px-3 py-2 text-sm'
        } ${active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/60 hover:text-ink'}`}
      >
        <n.icon className={`size-4 ${active ? 'text-accent' : ''}`} />
        {n.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className={`mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8 ${path === '/app' ? 'xl:max-w-[90rem]' : ''}`}>
        <Link href="/" aria-label="Beranda Niskala" className="rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Utama" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => link(n))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {path !== '/app' && (
            <Link href="/app" className="btn btn-primary btn-sm">
              Mulai sekarang
              <IconArrowRight className="size-4" />
            </Link>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-icon md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          onClick={() => {
            setOpen(!open);
            setOpenedAt(path);
          }}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="enter border-t border-rule bg-paper px-4 pt-2 pb-5 md:hidden">
          <nav aria-label="Utama" className="flex flex-col gap-1">
            {NAV.map((n) => link(n, true))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-4">
            <span className="text-sm text-muted">Tema</span>
            <ThemeToggle />
          </div>
          {path !== '/app' && (
            <Link href="/app" className="btn btn-primary mt-4 w-full">
              Mulai sekarang
              <IconArrowRight className="size-4" />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
