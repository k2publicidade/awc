import { NextResponse } from 'next/server';
import { requireMasterSession } from '@/lib/master-auth';
import { getMasterDashboard } from '@/lib/master-data';

export async function GET() {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const report = await getMasterDashboard();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ...report,
  });
}
