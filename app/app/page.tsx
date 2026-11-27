import type { Metadata } from 'next';
import { Drift } from '@/components/ambient';
import Workspace from '@/components/workspace';

export const metadata: Metadata = {
  title: 'Ruang Kerja',
  description: 'Postur dan kedipan langsung, jeda napas, cek stres harian, kabar mingguan, dan layar hangat menjelang tidur. Berjalan sepenuhnya di browser.',
};

export default function AppPage() {
  // Fewer and slower than on the landing page: this is a screen people work beside for hours.
  return (
    <div className="relative overflow-x-clip">
      <Drift
        spots={[
          { top: '6%', left: '-5%', size: '24rem', turn: 200, float: 19 },
          { top: '56%', right: '-6%', size: '28rem', turn: 230, float: 23 },
        ]}
      />
      <Workspace />
    </div>
  );
}
