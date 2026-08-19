import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { ObraProvider } from '@/components/providers/obra-provider';
import { requireSession } from '@/lib/session-context';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSession(undefined, { allowPasswordChange: true });

  if (!context) {
    redirect('/login');
  }

  if (context.mustChangePassword) redirect('/change-password');
  if (context.role === 'MASTER_ADMIN') redirect('/master');

  return (
    <ObraProvider>
      <AppLayout>{children}</AppLayout>
    </ObraProvider>
  );
}
