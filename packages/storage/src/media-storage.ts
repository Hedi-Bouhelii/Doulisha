import {
  privateDownloadUrl,
  signParams,
  signUpload,
  verifyUploadResponse,
  type CloudinaryConfig,
} from './cloudinary';
import { signUploadToken } from './local';

/**
 * Where module MED stores originals (ADR 0026): Cloudinary, or local disk for
 * runs without Cloudinary keys. Both answer an upload the same way, so the
 * services and the upload form do not care which one is in use.
 */

/** What the upload endpoint answers: Cloudinary's fields, mimicked by the local route. */
export interface MediaUploadAnswer {
  public_id: string;
  version: number;
  width?: number | undefined;
  height?: number | undefined;
  format: string;
  bytes: number;
  signature: string;
}

/** How the browser sends the original file. */
export interface MediaUploadForm {
  provider: 'cloudinary' | 'local';
  /** Cloudinary: multipart POST of `fields` and `file`. Local: PUT of the raw file. */
  method: 'POST' | 'PUT';
  url: string;
  fields: Record<string, string>;
  publicId: string;
}

export interface MediaStorage {
  readonly provider: 'cloudinary' | 'local';
  /** Folder of this environment; every public id starts with it. */
  readonly folder: string;
  signUpload(input: {
    publicId: string;
    private: boolean;
    allowedFormats: readonly string[];
    contentType: string;
    maxBytes: number;
    now?: Date;
  }): MediaUploadForm;
  /** True when the answer was signed by the provider for this public id and version. */
  verifyAnswer(answer: MediaUploadAnswer): boolean;
  /**
   * A short-lived signed link to the original (private proofs, test T2).
   * Null for local files, which the app reads from disk.
   */
  originalUrl(input: {
    publicId: string;
    format: string;
    private: boolean;
    now?: Date;
  }): string | null;
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function createCloudinaryStorage(config: CloudinaryConfig): MediaStorage {
  return {
    provider: 'cloudinary',
    folder: config.folder,
    signUpload(input) {
      const { url, fields } = signUpload(config, {
        publicId: input.publicId,
        type: input.private ? 'authenticated' : 'upload',
        allowedFormats: input.allowedFormats,
        timestamp: seconds(input.now ?? new Date()),
      });
      return { provider: 'cloudinary', method: 'POST', url, fields, publicId: input.publicId };
    },
    verifyAnswer: (answer) => verifyUploadResponse(answer, config.apiSecret),
    originalUrl(input) {
      const now = seconds(input.now ?? new Date());
      return privateDownloadUrl(config, {
        publicId: input.publicId,
        format: input.format,
        type: input.private ? 'authenticated' : 'upload',
        timestamp: now,
        expiresAt: now + 60,
      });
    },
  };
}

/**
 * Local disk (CI and E2E without keys): the web app's /api/media/upload route
 * stores the file and answers like Cloudinary, signed with `secret`.
 */
export function createLocalMediaStorage({
  secret,
  folder,
}: {
  secret: string;
  folder: string;
}): MediaStorage {
  return {
    provider: 'local',
    folder,
    signUpload(input) {
      const token = signUploadToken(
        {
          key: input.publicId,
          bucket: input.private ? 'private' : 'public',
          contentType: input.contentType,
          maxBytes: input.maxBytes,
          exp: (input.now ?? new Date()).getTime() + 10 * 60_000,
        },
        secret,
      );
      return {
        provider: 'local',
        method: 'PUT',
        url: `/api/media/upload/${token}`,
        fields: {},
        publicId: input.publicId,
      };
    },
    verifyAnswer: (answer) => verifyUploadResponse(answer, secret),
    originalUrl: () => null,
  };
}

/** The local route's answer signature, the same rule as Cloudinary's (version 1). */
export function signLocalAnswer(answer: { public_id: string; version: number }, secret: string) {
  return signParams({ public_id: answer.public_id, version: answer.version }, secret, 1);
}
