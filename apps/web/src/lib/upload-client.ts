export const MAX_CLIENT_UPLOAD_SIZE = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  zip: 'application/zip',
};

/** Alguns navegadores moveis entregam DOCX, XLSX e ZIP sem MIME. */
export function normalizeUploadFile(file: File) {
  if (file.type && file.type !== 'application/octet-stream') return file;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const inferredType = MIME_BY_EXTENSION[extension];
  if (!inferredType) return file;
  return new File([file], file.name, {
    type: inferredType,
    lastModified: file.lastModified,
  });
}

export async function uploadFile(file: File, category: string) {
  if (!file || file.size === 0) throw new Error('Selecione um arquivo');
  if (file.size > MAX_CLIENT_UPLOAD_SIZE) throw new Error('O arquivo deve ter no máximo 10 MB');

  const normalizedFile = normalizeUploadFile(file);

  const data = new FormData();
  data.set('file', normalizedFile);
  data.set('category', category);
  const response = await fetch('/api/uploads', { method: 'POST', body: data });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o arquivo');
  return result.url as string;
}
