import { redirect } from 'next/navigation';
import { MasterShell } from '@/components/master/master-shell';
import { requireMasterSession } from '@/lib/master-auth';
import './master.css';

export const dynamic = 'force-dynamic';

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const context = await requireMasterSession();
  if (!context) redirect('/login');

  return (
    <MasterShell
      user={{ name: context.session.user?.name, email: context.session.user?.email }}
    >
      {children}
    </MasterShell>
  );
}
