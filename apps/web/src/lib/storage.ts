const DEFAULT_BUCKET = 'rigor-uploads';
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
]);

let bucketReady: Promise<void> | null = null;

function storageConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  if (!baseUrl || !serviceKey) {
    throw new Error('Supabase Storage não configurado no ambiente');
  }
  return { baseUrl, serviceKey, bucket };
}

function storageHeaders(contentType?: string) {
  const { serviceKey } = storageConfig();
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

async function ensureBucket() {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    const { baseUrl, bucket } = storageConfig();
    const check = await fetch(`${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      headers: storageHeaders(),
      cache: 'no-store',
    });
    if (check.ok) return;

    const checkDetail = await readStorageError(check);
    if (isRejectedStorageCredential(check.status, checkDetail)) {
      throw new Error(
        'A credencial do Supabase Storage foi rejeitada. Atualize SUPABASE_SERVICE_ROLE_KEY no ambiente de produção.'
      );
    }
    if (!isMissingBucket(check.status, checkDetail)) {
      throw new Error(
        `Não foi possível consultar o armazenamento (${check.status})${checkDetail ? `: ${checkDetail}` : ''}`
      );
    }
    const create = await fetch(`${baseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: storageHeaders('application/json'),
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: false,
        file_size_limit: MAX_UPLOAD_SIZE,
      }),
    });
    if (!create.ok && create.status !== 409) {
      throw new Error(`Não foi possível preparar o armazenamento (${create.status})`);
    }
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

async function readStorageError(response: Response) {
  const raw = await response.text().catch(() => '');
  if (!raw) return '';
  try {
    const body = JSON.parse(raw) as { message?: unknown; error?: unknown; code?: unknown };
    return [body.error, body.message, body.code]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(': ');
  } catch {
    return raw.slice(0, 500);
  }
}

function isRejectedStorageCredential(status: number, detail: string) {
  return (
    status === 401 ||
    status === 403 ||
    /unauthorized|accessdenied|signature verification failed|invalid jwt/i.test(detail)
  );
}

function isMissingBucket(status: number, detail: string) {
  return (
    status === 404 || (status === 400 && /bucket[^:]*not found|not found[^:]*bucket/i.test(detail))
  );
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return safe.replace(/^[-.]+|[-.]+$/g, '').slice(0, 120) || 'arquivo';
}

export function uploadRouteForPath(path: string) {
  return `/api/uploads/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function isManagedUploadUrl(value: unknown, tenantId: string): value is string {
  return typeof value === 'string' && value.startsWith(`/api/uploads/${tenantId}/`);
}

export async function storeUpload(path: string, file: File) {
  await ensureBucket();
  const { baseUrl, bucket } = storageConfig();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: { ...storageHeaders(file.type || 'application/octet-stream'), 'x-upsert': 'false' },
      body: await file.arrayBuffer(),
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Falha ao armazenar arquivo (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }
}

export async function readUpload(path: string) {
  const { baseUrl, bucket } = storageConfig();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, {
    headers: storageHeaders(),
    cache: 'no-store',
  });
}
