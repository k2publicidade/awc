import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/dashboard');
  }

  if ((session.user as DynamicValue)?.role === 'MASTER_ADMIN') {
    redirect('/master');
  }

  redirect('/dashboard');
}
