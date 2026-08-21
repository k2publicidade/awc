export interface PendingRdoPhoto {
  file?: File;
  legenda?: string;
  capturedAt?: string;
  location?: { latitude: number; longitude: number } | null;
}

interface PersistRdoWithPhotosOptions<TPhoto extends PendingRdoPhoto> {
  photos: TPhoto[];
  uploadPhoto: (file: File) => Promise<string>;
  saveRdo: () => Promise<string>;
  linkPhoto: (photo: TPhoto & { rdoId: string; url: string }) => Promise<void>;
}

/**
 * Uploads pending evidence before writing the RDO so a storage outage cannot
 * leave a newly-created RDO behind while the UI reports that saving failed.
 */
export async function persistRdoWithPhotos<TPhoto extends PendingRdoPhoto>({
  photos,
  uploadPhoto,
  saveRdo,
  linkPhoto,
}: PersistRdoWithPhotosOptions<TPhoto>) {
  const uploaded: Array<{ photo: TPhoto; url: string }> = [];
  for (const photo of photos) {
    if (photo.file) uploaded.push({ photo, url: await uploadPhoto(photo.file) });
  }

  const rdoId = await saveRdo();
  for (const { photo, url } of uploaded) {
    await linkPhoto({ ...photo, rdoId, url });
  }
  return rdoId;
}
