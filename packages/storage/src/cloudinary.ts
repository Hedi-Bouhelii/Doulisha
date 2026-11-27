import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Cloudinary signatures, server side only (ADR 0026). Same rules as the
 * official SDK, without the dependency: parameters sorted by name, joined
 * with "&", followed by the API secret, hashed with SHA-1 (valid one hour).
 */
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Folder of this environment, e.g. "doulisha/prod". */
  folder: string;
}

type ParamValue = string | number | boolean | readonly string[] | null | undefined;
export type SignableParams = Record<string, ParamValue>;

/** Never signed: sent alongside, or part of the URL (Cloudinary docs). */
const UNSIGNED = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);

/**
 * The string Cloudinary signs. Version 2 (used for requests) escapes "&"
 * inside values so a value cannot smuggle another parameter; version 1 is
 * what Cloudinary uses to sign its own upload responses.
 */
export function stringToSign(params: SignableParams, version: 1 | 2 = 2): string {
  return Object.entries(params)
    .filter(
      ([key, value]) => !UNSIGNED.has(key) && value !== null && value !== undefined && value !== '',
    )
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => {
      const pair = `${key}=${value}`;
      return version === 2 ? pair.replace(/&/g, '%26') : pair;
    })
    .join('&');
}

export function signParams(params: SignableParams, apiSecret: string, version: 1 | 2 = 2): string {
  return createHash('sha1')
    .update(stringToSign(params, version) + apiSecret)
    .digest('hex');
}

function sameHex(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checks that an upload answer really comes from Cloudinary: it signs
 * `public_id` and `version` with our secret (signature version 1).
 */
export function verifyUploadResponse(
  response: { public_id: string; version: number; signature: string },
  apiSecret: string,
): boolean {
  const expected = signParams(
    { public_id: response.public_id, version: response.version },
    apiSecret,
    1,
  );
  return sameHex(expected, response.signature);
}

export function uploadEndpoint(cloudName: string) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

/**
 * Form fields for one signed upload of an original file (spec 2.2: no upload
 * preset, no incoming transformation). `authenticated` assets can only be
 * read with a signed request (payment proofs, MED-05).
 */
export function signUpload(
  config: CloudinaryConfig,
  input: {
    publicId: string;
    type: 'upload' | 'authenticated';
    allowedFormats: readonly string[];
    timestamp: number;
  },
) {
  const params: SignableParams = {
    public_id: input.publicId,
    timestamp: input.timestamp,
    allowed_formats: input.allowedFormats,
    // "upload" is Cloudinary's default; only the other type is sent.
    type: input.type === 'upload' ? undefined : input.type,
  };
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    fields[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  fields.api_key = config.apiKey;
  fields.signature = signParams(params, config.apiSecret);
  return { url: uploadEndpoint(config.cloudName), fields };
}

/**
 * Signed, expiring link to an original file through the download API, for
 * reading private payment proofs server side and for checksum tests (T2).
 */
export function privateDownloadUrl(
  config: CloudinaryConfig,
  input: {
    publicId: string;
    format: string;
    type: 'upload' | 'authenticated';
    /** Unix seconds. */
    expiresAt: number;
    /** Unix seconds. */
    timestamp: number;
  },
) {
  const params: SignableParams = {
    public_id: input.publicId,
    format: input.format,
    type: input.type,
    expires_at: input.expiresAt,
    timestamp: input.timestamp,
  };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));
  query.set('signature', signParams(params, config.apiSecret));
  query.set('api_key', config.apiKey);
  return `https://api.cloudinary.com/v1_1/${config.cloudName}/image/download?${query.toString()}`;
}
