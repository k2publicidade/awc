import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-context';
import { readUpload } from '@/lib/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { path } = await params;
  if (!path?.length || path[0] !== context.tenantId || path.some((part) => !part || part === '..')) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const stored = await readUpload(path.join('/'));
  if (!stored.ok) {
    return NextResponse.json(
      { error: stored.status === 404 ? 'Arquivo não encontrado' : 'Falha ao abrir arquivo' },
      { status: stored.status === 404 ? 404 : 502 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', stored.headers.get('content-type') || 'application/octet-stream');
  const contentLength = stored.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(stored.body, { headers });
}
