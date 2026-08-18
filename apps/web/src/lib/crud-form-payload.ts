import type { CrudField } from './crud-config';

type DynamicValue = Record<string, unknown>;

type BuildCrudPayloadOptions = {
  fields: CrudField[];
  formData: FormData;
  currentRow?: DynamicValue;
  defaults?: DynamicValue;
  upload: (file: File, category: string) => Promise<string>;
  fallbackCategory: string;
};

/**
 * Converte o formulario em um PATCH/POST seguro.
 *
 * Em edicoes, campos de arquivo sem uma nova selecao sao omitidos. Assim o
 * backend preserva a URL ja persistida, em vez de apagar o anexo ao salvar
 * uma alteracao em outro campo.
 */
export async function buildCrudPayload({
  fields,
  formData,
  currentRow,
  defaults = {},
  upload,
  fallbackCategory,
}: BuildCrudPayloadOptions) {
  const body: DynamicValue = { ...defaults };

  for (const field of fields) {
    if (field.type === 'file') {
      const selected = formData.get(field.name);
      if (selected instanceof File && selected.size > 0) {
        body[field.name] = await upload(
          selected,
          field.uploadCategory || fallbackCategory || 'geral'
        );
      } else if (field.required && !currentRow?.[field.name]) {
        throw new Error(`Selecione o arquivo: ${field.label}`);
      }
      continue;
    }

    body[field.name] =
      field.type === 'boolean' ? formData.get(field.name) === 'on' : formData.get(field.name);
  }

  return body;
}
