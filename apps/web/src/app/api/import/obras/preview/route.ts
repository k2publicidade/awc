import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';
import { parseObraFile } from '@/lib/import/obra-import';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.docx', '.mpp', '.xml', '.pdf'];

export async function POST(request: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'obras', true))
    return NextResponse.json({ error: 'Sem permissão para importar obras' }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json({ error: 'Selecione um arquivo para importar' }, { status: 400 });
    if (!file.size) return NextResponse.json({ error: 'O arquivo está vazio' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: 'O arquivo deve ter no máximo 30 MB' }, { status: 413 });

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (!ALLOWED_EXTENSIONS.includes(extension))
      return NextResponse.json(
        { error: 'Formato não suportado. Envie .mpp, .xml, .pdf, .xlsx, .csv ou .docx.' },
        { status: 415 }
      );

    const preview = await parseObraFile({
      name: file.name.slice(0, 255),
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível interpretar o arquivo';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
