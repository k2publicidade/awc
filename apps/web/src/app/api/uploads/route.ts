import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-context';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_SIZE,
  sanitizeFileName,
  storeUpload,
  uploadRouteForPath,
} from '@/lib/storage';

const ALLOWED_CATEGORIES = new Set([
  'documentos',
  'contratos',
  'certificados',
  'galeria',
  'qualidade',
  'perfis',
  'empresas',
  'geral',
]);

export async function POST(request: Request) {
  try {
    const context = await requireSession();
    if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const requestedCategory = String(formData.get('category') || 'geral').toLowerCase();
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Selecione um arquivo' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'O arquivo deve ter no máximo 10 MB' }, { status: 413 });
    }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 415 });
    }

    const category = ALLOWED_CATEGORIES.has(requestedCategory) ? requestedCategory : 'geral';
    const safeName = sanitizeFileName(file.name);
    const month = new Date().toISOString().slice(0, 7);
    const path = `${context.tenantId}/${category}/${month}/${crypto.randomUUID()}-${safeName}`;
    await storeUpload(path, file);

    return NextResponse.json(
      { url: uploadRouteForPath(path), name: file.name, type: file.type, size: file.size },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao enviar arquivo' },
      { status: 500 }
    );
  }
}
