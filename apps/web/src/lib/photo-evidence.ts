'use client';

export interface EvidenceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface EvidenceMetadata {
  obra: string;
  responsavel: string;
  capturedAt?: Date;
  location?: EvidenceLocation | null;
}

export interface WatermarkedEvidence {
  file: File;
  previewUrl: string;
  capturedAt: string;
  location: EvidenceLocation | null;
}

export function requestEvidenceLocation(timeout = 8000): Promise<EvidenceLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 }
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível processar a imagem'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a evidência'))),
      type,
      quality
    );
  });
}

export async function createWatermarkedEvidence(
  source: File,
  metadata: EvidenceMetadata
): Promise<WatermarkedEvidence> {
  if (!source.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem');

  const [image, detectedLocation] = await Promise.all([
    loadImage(source),
    metadata.location === undefined ? requestEvidenceLocation() : Promise.resolve(metadata.location),
  ]);
  const capturedAt = metadata.capturedAt || new Date();
  const maxSide = 2200;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não permite preparar a evidência fotográfica');

  context.drawImage(image, 0, 0, width, height);

  const scale = Math.max(0.72, Math.min(1.4, width / 1400));
  const padding = Math.round(30 * scale);
  const bandHeight = Math.round(190 * scale);
  const gradient = context.createLinearGradient(0, height - bandHeight * 1.5, 0, height);
  gradient.addColorStop(0, 'rgba(6, 12, 19, 0)');
  gradient.addColorStop(0.35, 'rgba(6, 12, 19, 0.78)');
  gradient.addColorStop(1, 'rgba(6, 12, 19, 0.96)');
  context.fillStyle = gradient;
  context.fillRect(0, height - bandHeight * 1.5, width, bandHeight * 1.5);

  context.fillStyle = '#ff5a00';
  context.fillRect(padding, height - bandHeight + padding / 2, Math.round(7 * scale), bandHeight - padding);

  const left = padding + Math.round(25 * scale);
  const baseY = height - padding;
  context.textBaseline = 'bottom';
  context.shadowColor = 'rgba(0,0,0,.5)';
  context.shadowBlur = Math.round(4 * scale);
  context.fillStyle = '#ffffff';
  context.font = `700 ${Math.round(30 * scale)}px Arial, sans-serif`;
  context.fillText((metadata.obra || 'Obra não informada').slice(0, 62), left, baseY - Math.round(76 * scale));

  context.font = `600 ${Math.round(22 * scale)}px Arial, sans-serif`;
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(capturedAt);
  context.fillText(`${formattedDate}  •  ${metadata.responsavel || 'Responsável não informado'}`.slice(0, 88), left, baseY - Math.round(38 * scale));

  context.fillStyle = '#d8dee4';
  context.font = `500 ${Math.round(18 * scale)}px Arial, sans-serif`;
  const locationLine = detectedLocation
    ? `GPS ${detectedLocation.latitude.toFixed(6)}, ${detectedLocation.longitude.toFixed(6)}${detectedLocation.accuracy ? `  •  precisão ±${Math.round(detectedLocation.accuracy)} m` : ''}`
    : 'Localização indisponível • registro preservado com data e autoria';
  context.fillText(locationLine, left, baseY);

  context.shadowBlur = 0;
  context.textAlign = 'right';
  context.fillStyle = '#ff5a00';
  context.font = `900 ${Math.round(25 * scale)}px Arial, sans-serif`;
  context.fillText('RIGOR', width - padding, baseY - Math.round(76 * scale));

  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.88);
  const stem = source.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const file = new File([blob], `${stem || 'evidencia'}-rigor.jpg`, {
    type: 'image/jpeg',
    lastModified: capturedAt.getTime(),
  });

  return {
    file,
    previewUrl: URL.createObjectURL(file),
    capturedAt: capturedAt.toISOString(),
    location: detectedLocation || null,
  };
}
