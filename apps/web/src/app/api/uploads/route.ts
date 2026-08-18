import { NextResponse } from 'next/server';
import sharp from 'sharp';
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
  'rdo',
  'qualidade',
  'perfis',
  'empresas',
  'geral',
]);

const NORMALIZED_PHOTO_CATEGORIES = new Set(['galeria', 'rdo', 'qualidade']);

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
    let storedFile = file;
    if (NORMALIZED_PHOTO_CATEGORIES.has(category) && file.type.startsWith('image/')) {
      try {
        const jpeg = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'warning' })
          .rotate()
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();
        if (jpeg.byteLength > MAX_UPLOAD_SIZE) {
          return NextResponse.json({ error: 'A imagem processada deve ter no máximo 10 MB' }, { status: 413 });
        }
        storedFile = new File([new Uint8Array(jpeg)], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      } catch {
        return NextResponse.json(
          { error: 'Formato de imagem não compatível. Use JPEG, PNG, WebP, GIF, HEIC ou HEIF válido.' },
          { status: 415 }
        );
      }
    }
    const safeName = sanitizeFileName(storedFile.name);
    const month = new Date().toISOString().slice(0, 7);
    const path = `${context.tenantId}/${category}/${month}/${crypto.randomUUID()}-${safeName}`;
    await storeUpload(path, storedFile);

    return NextResponse.json(
      { url: uploadRouteForPath(path), name: storedFile.name, type: storedFile.type, size: storedFile.size },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao enviar arquivo' },
      { status: 500 }
    );
  }
}
