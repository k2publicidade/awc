interface PdfPhoto {
  bytes: Uint8Array;
  legenda?: string | null;
  data?: Date | string | null;
}

interface PdfRdoData {
  numero: number;
  data: Date | string;
  obra: string;
  responsavel: string;
  clima?: string;
  efetivos: Array<{ funcao: string; presentes: number; ausentes: number }>;
  atividades: Array<{ descricao: string; etapa: string; percentual: number }>;
  equipamentos: Array<{ nome: string; horas: number }>;
  observacoes?: string | null;
  fotos: PdfPhoto[];
}

type PdfImage = PdfPhoto & { width: number; height: number; objectId: number };

function latin(value: unknown) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '|')
    .replace(/[^ -ÿ]/g, '?');
}

function pdfText(value: unknown) {
  return latin(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function jpegSize(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    if (!length) break;
    offset += 2 + length;
  }
  return null;
}

function wrap(value: string, max = 88) {
  const words = latin(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

export function generateRdoPdf(data: PdfRdoData) {
  const validPhotos = data.fotos
    .map((photo) => ({ photo, size: jpegSize(photo.bytes) }))
    .filter((entry): entry is { photo: PdfPhoto; size: { width: number; height: number } } => Boolean(entry.size));

  const objects = new Map<number, Buffer>();
  let nextObjectId = 4;
  const images: PdfImage[] = validPhotos.map(({ photo, size }) => ({
    ...photo,
    ...size,
    objectId: nextObjectId++,
  }));

  const pages: Array<{ commands: string[]; images: PdfImage[]; pageObjectId?: number; contentObjectId?: number }> = [];
  let current = { commands: [] as string[], images: [] as PdfImage[] };
  let y = 795;

  const newPage = () => {
    if (current.commands.length) pages.push(current);
    current = { commands: [], images: [] };
    y = 795;
    current.commands.push('0.11 0.16 0.20 rg');
  };
  const line = (text: string, size = 10, bold = false, indent = 40) => {
    if (y < 55) newPage();
    current.commands.push(`BT /F1 ${bold ? size + 1 : size} Tf ${indent} ${y} Td (${pdfText(text)}) Tj ET`);
    y -= size + 7;
  };
  const heading = (text: string) => {
    y -= 5;
    line(text.toUpperCase(), 12, true);
    current.commands.push(`1 0.35 0 RG 40 ${y + 5} m 555 ${y + 5} l S`);
    y -= 5;
  };

  newPage();
  current.commands.push('1 0.35 0 rg 40 812 65 18 re f');
  current.commands.push('1 1 1 rg BT /F1 12 Tf 52 817 Td (RIGOR) Tj ET');
  current.commands.push('0.11 0.16 0.20 rg');
  line(`RELATÓRIO DIÁRIO DE OBRA - RDO Nº ${data.numero}`, 17, true);
  line(`${data.obra} | ${new Date(data.data).toLocaleDateString('pt-BR')}`, 11, true);
  line(`Responsável: ${data.responsavel || '-'}`, 10);
  if (data.clima) line(`Condições: ${data.clima}`, 10);

  if (data.efetivos.length) {
    heading('Efetivo');
    for (const item of data.efetivos) line(`${item.funcao}: ${item.presentes} presente(s), ${item.ausentes} ausente(s)`, 9);
  }
  if (data.atividades.length) {
    heading('Atividades executadas');
    for (const item of data.atividades) {
      for (const [index, text] of wrap(`${item.etapa} - ${item.descricao} (${item.percentual}%)`, 92).entries()) {
        line(`${index ? '  ' : '- '}${text}`, 9);
      }
    }
  }
  if (data.equipamentos.length) {
    heading('Equipamentos');
    for (const item of data.equipamentos) line(`${item.nome}: ${item.horas}h`, 9);
  }
  if (data.observacoes) {
    heading('Observações');
    for (const text of wrap(data.observacoes)) line(text, 9);
  }

  if (images.length) {
    heading(`Evidências fotográficas (${images.length})`);
    for (const [index, image] of images.entries()) {
      const maxWidth = 515;
      const maxHeight = 310;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      if (y - height - 42 < 45) newPage();
      current.images.push(image);
      current.commands.push(`q ${width} 0 0 ${height} 40 ${y - height} cm /Im${image.objectId} Do Q`);
      y -= height + 15;
      line(`${index + 1}. ${image.legenda || 'Evidência de campo'} | ${image.data ? new Date(image.data).toLocaleString('pt-BR') : ''}`, 8);
      y -= 8;
    }
  } else {
    heading('Evidências fotográficas');
    line('Nenhuma evidência JPEG disponível neste relatório.', 9);
  }

  if (current.commands.length) pages.push(current);

  for (const image of images) {
    const header = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      'ascii'
    );
    objects.set(image.objectId, Buffer.concat([header, Buffer.from(image.bytes), Buffer.from('\nendstream', 'ascii')]));
  }

  for (const page of pages) {
    page.contentObjectId = nextObjectId++;
    page.pageObjectId = nextObjectId++;
  }
  objects.set(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'));
  objects.set(
    2,
    Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((page) => `${page.pageObjectId} 0 R`).join(' ')}] >>`, 'ascii')
  );
  objects.set(3, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'ascii'));

  for (const [pageIndex, page] of pages.entries()) {
    if (pageIndex > 0) {
      page.commands.unshift(
        `0.35 0.40 0.45 rg BT /F1 8 Tf 40 815 Td (${pdfText(`RIGOR | RDO ${data.numero} | ${data.obra}`)}) Tj ET`,
        '0.9 0.35 0 RG 40 806 m 555 806 l S'
      );
    }
    page.commands.push(
      '0.82 0.84 0.86 RG 40 34 m 555 34 l S',
      `0.35 0.40 0.45 rg BT /F1 7 Tf 40 20 Td (RIGOR - Documento gerado automaticamente) Tj ET`,
      `0.35 0.40 0.45 rg BT /F1 7 Tf 500 20 Td (Página ${pageIndex + 1} de ${pages.length}) Tj ET`
    );
    const content = Buffer.from(`${page.commands.join('\n')}\n`, 'latin1');
    objects.set(page.contentObjectId!, Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'ascii'), content, Buffer.from('endstream', 'ascii')]));
    const xObjects = page.images.map((image) => `/Im${image.objectId} ${image.objectId} 0 R`).join(' ');
    objects.set(
      page.pageObjectId!,
      Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << ${xObjects} >> >> /Contents ${page.contentObjectId} 0 R >>`, 'ascii')
    );
  }

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets = [0];
  for (let id = 1; id < nextObjectId; id++) {
    offsets[id] = chunks.reduce((total, chunk) => total + chunk.length, 0);
    chunks.push(Buffer.from(`${id} 0 obj\n`, 'ascii'), objects.get(id)!, Buffer.from('\nendobj\n', 'ascii'));
  }
  const xrefOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const xref = [`xref\n0 ${nextObjectId}\n`, '0000000000 65535 f \n'];
  for (let id = 1; id < nextObjectId; id++) xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  xref.push(`trailer\n<< /Size ${nextObjectId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(Buffer.from(xref.join(''), 'ascii'));
  return Buffer.concat(chunks);
}
