import 'server-only';

const ascii = (b: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...b.slice(start, end));

/** HEIF brands of iPhone photos (HEIC) and other HEIF files. */
const heifBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

/** First bytes of each accepted file type: the declared type must match the content. */
const signatures: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  'image/heic': (b) => ascii(b, 4, 8) === 'ftyp' && heifBrands.has(ascii(b, 8, 12)),
  'image/heif': (b) => ascii(b, 4, 8) === 'ftyp' && heifBrands.has(ascii(b, 8, 12)),
  'application/pdf': (b) => ascii(b, 0, 5) === '%PDF-',
};

/** True when the file's first bytes match its declared content type. */
export function fileMatchesType(contentType: string, bytes: Uint8Array): boolean {
  return signatures[contentType]?.(bytes) ?? false;
}
