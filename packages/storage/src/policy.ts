/**
 * What may be uploaded, where it goes and how big it may be
 * (BUILD_PROMPT section 7: presigned uploads with type and size limits;
 * private bucket for payment proofs and verification documents).
 */
export const uploadPolicies = {
  'event-cover': {
    bucket: 'public',
    maxBytes: 5 * 1024 * 1024,
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'event-photo': {
    bucket: 'public',
    maxBytes: 5 * 1024 * 1024,
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'payment-proof': {
    bucket: 'private',
    maxBytes: 8 * 1024 * 1024,
    contentTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
} as const satisfies Record<
  string,
  { bucket: 'public' | 'private'; maxBytes: number; contentTypes: readonly string[] }
>;

export type UploadPurpose = keyof typeof uploadPolicies;

export const uploadPurposes = Object.keys(uploadPolicies) as [UploadPurpose, ...UploadPurpose[]];

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export type PolicyCheck =
  | { ok: true; bucket: 'public' | 'private'; extension: string; maxBytes: number }
  | { ok: false; reason: 'type' | 'size' };

export function checkUpload(
  purpose: UploadPurpose,
  contentType: string,
  size: number,
): PolicyCheck {
  const policy = uploadPolicies[purpose];
  if (!(policy.contentTypes as readonly string[]).includes(contentType)) {
    return { ok: false, reason: 'type' };
  }
  if (size <= 0 || size > policy.maxBytes) return { ok: false, reason: 'size' };
  return {
    ok: true,
    bucket: policy.bucket,
    extension: extensions[contentType] ?? 'bin',
    maxBytes: policy.maxBytes,
  };
}

/**
 * Object keys start with the purpose and the owner's id, so services can check
 * that a key someone attaches was uploaded by them.
 */
export function buildKey(purpose: UploadPurpose, ownerId: string, id: string, extension: string) {
  return `${purpose}/${ownerId}/${id}.${extension}`;
}

export function keyBelongsTo(key: string, purpose: UploadPurpose, ownerId: string): boolean {
  return key.startsWith(`${purpose}/${ownerId}/`) && !key.includes('..');
}
