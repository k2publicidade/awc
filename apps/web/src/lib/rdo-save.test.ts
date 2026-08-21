import assert from 'node:assert/strict';
import test from 'node:test';
import { persistRdoWithPhotos } from './rdo-save';

test('does not persist the RDO when a pending photo cannot be uploaded', async () => {
  let saveCalls = 0;

  await assert.rejects(
    () =>
      persistRdoWithPhotos({
        photos: [{ file: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }) }],
        uploadPhoto: async () => {
          throw new Error('storage unavailable');
        },
        saveRdo: async () => {
          saveCalls += 1;
          return 'rdo-id';
        },
        linkPhoto: async () => undefined,
      }),
    /storage unavailable/
  );

  assert.equal(saveCalls, 0);
});

test('uploads pending photos before persisting and linking the RDO', async () => {
  const events: string[] = [];

  const id = await persistRdoWithPhotos({
    photos: [{ file: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }), legenda: 'Frente' }],
    uploadPhoto: async () => {
      events.push('upload');
      return '/api/uploads/tenant/rdo/photo.jpg';
    },
    saveRdo: async () => {
      events.push('save');
      return 'rdo-id';
    },
    linkPhoto: async ({ rdoId, url }) => {
      events.push(`link:${rdoId}:${url}`);
    },
  });

  assert.equal(id, 'rdo-id');
  assert.deepEqual(events, ['upload', 'save', 'link:rdo-id:/api/uploads/tenant/rdo/photo.jpg']);
});
