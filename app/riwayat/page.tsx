import type { Metadata } from 'next';
import HistoryView from '@/components/history-view';
import SiteFooter from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Riwayat',
  description: 'Waktu di layar, postur, jeda, dan stres selama beberapa minggu terakhir, dari data yang kesimpan di browsermu.',
};

export default function HistoryPage() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-8">
        <HistoryView />
      </main>
      <SiteFooter />
    </>
  );
}
