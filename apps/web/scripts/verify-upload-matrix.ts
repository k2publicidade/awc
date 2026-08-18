import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCrudPayload } from '../src/lib/crud-form-payload';
import { resourceConfig } from '../src/lib/crud-config';
import { isManagedUploadUrl } from '../src/lib/storage';
import { normalizeUploadFile } from '../src/lib/upload-client';

type ExpectedUpload = {
  resource: keyof typeof resourceConfig;
  field: string;
  category: string;
  required: boolean;
  modelField: string;
};

const expected: ExpectedUpload[] = [
  { resource: 'treinamentos', field: 'certificadoUrl', category: 'certificados', required: false, modelField: 'certificadoUrl' },
  { resource: 'documentos', field: 'arquivoUrl', category: 'documentos', required: false, modelField: 'arquivoUrl' },
  { resource: 'qualidade', field: 'fotoAntesUrl', category: 'qualidade', required: false, modelField: 'fotoAntesUrl' },
  { resource: 'qualidade', field: 'fotoDepoisUrl', category: 'qualidade', required: false, modelField: 'fotoDepoisUrl' },
  { resource: 'galeria', field: 'url', category: 'galeria', required: true, modelField: 'url' },
  { resource: 'contratos', field: 'arquivoUrl', category: 'contratos', required: false, modelField: 'arquivoUrl' },
];

const repoRoot = process.cwd();
const schema = readFileSync(resolve(repoRoot, 'packages/database/prisma/schema.prisma'), 'utf8');
const uploadRoute = readFileSync(resolve(repoRoot, 'apps/web/src/app/api/uploads/route.ts'), 'utf8');
const createRoute = readFileSync(resolve(repoRoot, 'apps/web/src/app/api/crud/[resource]/route.ts'), 'utf8');
const updateRoute = readFileSync(resolve(repoRoot, 'apps/web/src/app/api/crud/[resource]/[id]/route.ts'), 'utf8');
const downloadRoute = readFileSync(resolve(repoRoot, 'apps/web/src/app/api/uploads/[...path]/route.ts'), 'utf8');
const crudUi = readFileSync(resolve(repoRoot, 'apps/web/src/components/crud-module.tsx'), 'utf8');

const managedUrl = (tenant: string, category: string, name: string) =>
  `/api/uploads/${tenant}/${category}/2026-08/${name}`;

async function verifyLifecycle(item: ExpectedUpload) {
  const cfg = resourceConfig[item.resource];
  const field = cfg.fields.find((candidate) => candidate.name === item.field);
  assert(field, `${item.resource}.${item.field}: campo ausente no CRUD`);
  assert.equal(field.type, 'file', `${item.resource}.${item.field}: tipo deve ser file`);
  assert.equal(field.uploadCategory, item.category, `${item.resource}.${item.field}: categoria incorreta`);
  assert.equal(Boolean(field.required), item.required, `${item.resource}.${item.field}: obrigatoriedade incorreta`);
  assert(field.accept, `${item.resource}.${item.field}: formatos aceitos nao informados`);
  assert.match(schema, new RegExp(`\\b${item.modelField}\\s+String\\??`), `${item.resource}.${item.field}: coluna Prisma ausente`);
  assert(uploadRoute.includes(`'${item.category}'`), `${item.resource}.${item.field}: categoria nao liberada no endpoint`);

  const original = managedUrl('tenant-a', item.category, `original-${item.field}`);
  const replacement = managedUrl('tenant-a', item.category, `novo-${item.field}`);
  const imageOnly = field.accept?.split(',').every((type) => type.trim().startsWith('image/'));
  const sampleFile = (replacementFile = false) =>
    imageOnly
      ? new File([replacementFile ? 'nova-imagem' : 'imagem'], replacementFile ? 'nova.jpg' : 'evidencia.jpg', { type: 'image/jpeg' })
      : new File([replacementFile ? 'novo-documento' : 'documento'], replacementFile ? 'novo.pdf' : 'evidencia.pdf', { type: 'application/pdf' });
  let uploads = 0;

  const createData = new FormData();
  createData.set(item.field, sampleFile());
  const created = await buildCrudPayload({
    fields: [field],
    formData: createData,
    upload: async (_file, category) => {
      uploads += 1;
      assert.equal(category, item.category);
      return original;
    },
    fallbackCategory: cfg.key,
  });
  assert.equal(created[item.field], original, `${item.resource}.${item.field}: criacao nao persiste URL`);

  const editWithoutReplacement = await buildCrudPayload({
    fields: [field],
    formData: new FormData(),
    currentRow: { [item.field]: original },
    upload: async () => {
      throw new Error('upload nao deve ocorrer ao editar sem trocar o arquivo');
    },
    fallbackCategory: cfg.key,
  });
  assert(!(item.field in editWithoutReplacement), `${item.resource}.${item.field}: PATCH apagaria o arquivo atual`);

  const replacementData = new FormData();
  replacementData.set(item.field, sampleFile(true));
  const replaced = await buildCrudPayload({
    fields: [field],
    formData: replacementData,
    currentRow: { [item.field]: original },
    upload: async () => {
      uploads += 1;
      return replacement;
    },
    fallbackCategory: cfg.key,
  });
  assert.equal(replaced[item.field], replacement, `${item.resource}.${item.field}: substituicao nao chega ao PATCH`);
  assert.equal(uploads, 2, `${item.resource}.${item.field}: quantidade inesperada de uploads`);

  if (item.required) {
    await assert.rejects(
      buildCrudPayload({
        fields: [field],
        formData: new FormData(),
        upload: async () => original,
        fallbackCategory: cfg.key,
      }),
      /Selecione o arquivo/
    );
  }

  assert(isManagedUploadUrl(original, 'tenant-a'), `${item.resource}.${item.field}: URL propria rejeitada`);
  assert(!isManagedUploadUrl(original, 'tenant-b'), `${item.resource}.${item.field}: URL entre tenants aceita`);
  assert(!isManagedUploadUrl('https://files.example/evidencia.pdf', 'tenant-a'), `${item.resource}.${item.field}: URL externa aceita`);
}

async function main() {
  assert.equal(
    normalizeUploadFile(new File(['zip'], 'databook.zip')).type,
    'application/zip',
    'arquivo sem MIME nao e normalizado antes do envio'
  );
  assert.equal(
    normalizeUploadFile(new File(['xlsx'], 'medicoes.xlsx', { type: 'application/octet-stream' })).type,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'MIME generico nao e normalizado antes do envio'
  );

  for (const item of expected) await verifyLifecycle(item);

  // Garante que criacao e atualizacao aplicam o mesmo limite de URL gerenciada.
  assert(createRoute.includes('isManagedUploadUrl(value, opts.tenantId)'), 'POST nao valida URL gerenciada');
  assert(updateRoute.includes('isManagedUploadUrl(value, tenantId)'), 'PATCH nao valida URL gerenciada');
  // A listagem sem `select` devolve os campos de arquivo usados ao reabrir o modal.
  assert(createRoute.includes('include: cfg.include as DynamicValue'), 'listagem deixou de devolver o registro completo');
  // Download exige sessao e confere o primeiro segmento do caminho contra o tenant autenticado.
  assert(downloadRoute.includes('path[0] !== context.tenantId'), 'download nao isola o tenant');
  assert(downloadRoute.includes("headers.set('X-Content-Type-Options', 'nosniff')"), 'download sem protecao de MIME');
  assert(crudUi.includes('download'), 'interface sem acao explicita de download');
  assert(crudUi.includes("target=\"_blank\""), 'interface sem acao de reabertura do arquivo');

  console.table(
    expected.map((item) => ({
      modulo: item.resource,
      campo: item.field,
      categoria: item.category,
      contrato_criar: 'OK',
      preserva_ao_editar: 'OK',
      contrato_substituir: 'OK',
      campo_reabre: 'OK',
      acao_baixar: 'OK',
      isolamento_tenant: 'OK',
    }))
  );
  console.log(`Matriz contratual validada: ${expected.length} campos de upload em ${new Set(expected.map((item) => item.resource)).size} modulos. A homologacao com storage/DB deve ser executada no ambiente integrado.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
