/**
 * What may be uploaded through module MED (spec 2.3 and rule Q8, ADR 0026).
 * Browser-safe: the upload form checks the same limits before sending bytes.
 */

/** Upload kinds, and the spec's media purpose each one is stored under. */
export const mediaUploadPolicies = {
  'event-cover': { purpose: 'cover', private: false },
  'organizer-logo': { purpose: 'logo', private: false },
  'organizer-cover': { purpose: 'cover', private: false },
  'organizer-photo': { purpose: 'gallery', private: false },
  /** D17 screenshots and transfer receipts: never public (MED-05). */
  'payment-proof': { purpose: 'proof', private: true },
} as const satisfies Record<
  string,
  { purpose: 'cover' | 'gallery' | 'avatar' | 'logo' | 'proof'; private: boolean }
>;

export type MediaUploadKind = keyof typeof mediaUploadPolicies;
export type MediaPurpose = (typeof mediaUploadPolicies)[MediaUploadKind]['purpose'];

export const mediaUploadKinds = Object.keys(mediaUploadPolicies) as [
  MediaUploadKind,
  ...MediaUploadKind[],
];

/** Q8, within Cloudinary's free plan limit (OPEN_QUESTIONS Q30). */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

/** Q8: covers narrower than this get a "may look blurry" warning, never a refusal. */
export const COVER_MIN_WIDTH = 1200;

/** Accepted types and the format name Cloudinary gives them. HEIC is converted at delivery (Q7). */
const imageFormats: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};
const proofFormats: Record<string, string> = { ...imageFormats, 'application/pdf': 'pdf' };

function formatsOf(kind: MediaUploadKind) {
  return kind === 'payment-proof' ? proofFormats : imageFormats;
}

/** Cloudinary's format name for an accepted content type ("" when not accepted). */
export function formatOf(contentType: string): string {
  return proofFormats[contentType] ?? '';
}

/** Content types the file picker offers for a kind. */
export function acceptedContentTypes(kind: MediaUploadKind): string[] {
  return Object.keys(formatsOf(kind));
}

/** Format names Cloudinary may store for a kind (its `allowed_formats`). */
export function allowedFormats(kind: MediaUploadKind): string[] {
  return [...new Set(Object.values(formatsOf(kind)))];
}

/**
 * Browsers sometimes give HEIC files no type; the extension decides then.
 * Returns "" when the file is not one we accept.
 */
export function contentTypeOf(file: { type: string; name: string }, kind: MediaUploadKind): string {
  const types = formatsOf(kind);
  if (file.type && types[file.type]) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
  };
  const guess = byExtension[extension];
  return guess && types[guess] ? guess : '';
}

export type MediaUploadCheck =
  | { ok: true; format: string; private: boolean; purpose: MediaPurpose }
  | { ok: false; reason: 'type' | 'size' };

export function checkMediaUpload(
  kind: MediaUploadKind,
  contentType: string,
  size: number,
): MediaUploadCheck {
  const format = formatsOf(kind)[contentType];
  if (!format) return { ok: false, reason: 'type' };
  if (size <= 0 || size > MEDIA_MAX_BYTES) return { ok: false, reason: 'size' };
  const policy = mediaUploadPolicies[kind];
  return { ok: true, format, private: policy.private, purpose: policy.purpose };
}

/** `<folder>/<kind>/<userId>/<id>`: the uploader is part of the id, so a server can check it. */
export function mediaPublicId(folder: string, kind: MediaUploadKind, userId: string, id: string) {
  return `${folder}/${kind}/${userId}/${id}`;
}

export function mediaPublicIdBelongsTo(
  publicId: string,
  folder: string,
  kind: MediaUploadKind,
  userId: string,
): boolean {
  return (
    publicId.startsWith(`${folder}/${kind}/${userId}/`) &&
    /^[A-Za-z0-9/_-]+$/.test(publicId) &&
    !publicId.includes('//')
  );
}
