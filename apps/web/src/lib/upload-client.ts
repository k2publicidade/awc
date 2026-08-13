export const MAX_CLIENT_UPLOAD_SIZE = 10 * 1024 * 1024;

export async function uploadFile(file: File, category: string) {
  if (!file || file.size === 0) throw new Error('Selecione um arquivo');
  if (file.size > MAX_CLIENT_UPLOAD_SIZE) throw new Error('O arquivo deve ter no máximo 10 MB');

  const data = new FormData();
  data.set('file', file);
  data.set('category', category);
  const response = await fetch('/api/uploads', { method: 'POST', body: data });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o arquivo');
  return result.url as string;
}
