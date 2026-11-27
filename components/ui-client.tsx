'use client';

import { useEffect, useId, useRef, useSyncExternalStore, type ComponentType, type SVGProps } from 'react';
import { dismissToast, toastStore } from '@/lib/toast';
import { IconCheck, IconClose, IconInfo } from './icons';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export function Switch({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer text-sm">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </label>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="switch">
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function Segmented<T extends string | number>({ label, value, options, onChange, size = 'md', className = '' }: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: IconType }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`seg ${className}`}>
      {options.map((o) => (
        <label key={String(o.value)} className={`seg-item ${size === 'sm' ? 'px-2.5 py-1 text-[13px]' : ''}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.icon && <o.icon className="size-4" />}
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs, label }: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string; icon: IconType }[];
  label: string;
}) {
  const base = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid border-b border-rule px-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        const i = tabs.findIndex((t) => t.value === value);
        const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (next === null) return;
        const t = tabs[(next + tabs.length) % tabs.length];
        onChange(t.value);
        document.getElementById(`${base}-${t.value}`)?.focus();
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          id={`${base}-${t.value}`}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          tabIndex={value === t.value ? 0 : -1}
          onClick={() => onChange(t.value)}
          className="tab"
        >
          <t.icon className="size-4" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirm, onConfirm, onClose }: {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title" className="text-lg">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted text-pretty">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose} autoFocus>
          Batal
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </dialog>
  );
}

export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.server);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="toast enter pointer-events-auto">
          {t.tone === 'ok' ? <IconCheck className="size-4 text-accent" /> : <IconInfo className="size-4 text-muted" />}
          <span className="flex-1">{t.text}</span>
          <button type="button" className="text-muted hover:text-ink" onClick={() => dismissToast(t.id)} aria-label="Tutup notifikasi">
            <IconClose className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
