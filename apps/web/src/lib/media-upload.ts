'use client';

import type { MediaRef } from '@doulisha/storage/delivery';
import {
  contentTypeOf,
  COVER_MIN_WIDTH,
  MEDIA_MAX_BYTES,
  type MediaUploadKind,
} from '@doulisha/storage/media-policy';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useTRPC } from '@/trpc/client';

export interface UploadedMedia {
  id: string;
  media: MediaRef;
}

export interface MediaTarget {
  eventId?: string;
  organizerProfileId?: string;
  /** Booking reference, for payment proofs. */
  reference?: string;
}

/** Answer fields `media.confirm` checks (Cloudinary sends many more). */
interface StorageAnswer {
  public_id: string;
  version: number;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
  signature: string;
}

/** SHA-256 of the file, hex. Reads the bytes; never changes them (rule Q1). */
async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Module MED upload (spec 2.3, ADR 0026): asks the server for a signature,
 * sends the original file straight to storage (no canvas, no compression, no
 * resizing), then records it. Errors are `Error`s whose message is an i18n
 * key such as "errors.fileTooLarge", for `useErrorMessage`.
 */
export function useMediaUpload(kind: MediaUploadKind) {
  const trpc = useTRPC();
  const { mutateAsync: sign } = useMutation(trpc.media.sign.mutationOptions());
  const { mutateAsync: confirm } = useMutation(trpc.media.confirm.mutationOptions());

  return useCallback(
    async (file: File, target: MediaTarget = {}): Promise<UploadedMedia> => {
      const contentType = contentTypeOf(file, kind);
      if (!contentType) throw new Error('errors.fileType');
      if (file.size > MEDIA_MAX_BYTES) throw new Error('errors.fileTooLarge');

      const [form, checksumSha256] = await Promise.all([
        sign({ kind, contentType, size: file.size, ...target }),
        sha256Hex(file),
      ]);
      let response: Response;
      try {
        if (form.method === 'POST') {
          const body = new FormData();
          for (const [name, value] of Object.entries(form.fields)) body.append(name, value);
          body.append('file', file);
          response = await fetch(form.url, { method: 'POST', body });
        } else {
          response = await fetch(form.url, {
            method: 'PUT',
            headers: { 'content-type': contentType },
            body: file,
          });
        }
      } catch {
        throw new Error('errors.uploadFailed');
      }
      if (!response.ok) throw new Error('errors.uploadFailed');
      const answer = (await response.json()) as StorageAnswer;
      return confirm({
        kind,
        answer: {
          public_id: answer.public_id,
          version: answer.version,
          width: answer.width,
          height: answer.height,
          format: answer.format,
          bytes: answer.bytes,
          signature: answer.signature,
        },
        size: file.size,
        checksumSha256,
        eventId: target.eventId,
      });
    },
    [kind, sign, confirm],
  );
}

/** Q8: a cover narrower than 1,200 px may look blurry; warn, never refuse. */
export function isLowResolutionCover(media: MediaRef): boolean {
  return media.width > 0 && media.width < COVER_MIN_WIDTH;
}

/** `accept` attribute of file inputs: HEIC from iPhones is accepted (Q7). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

/** `accept` of the payment proof input: images (HEIC included) or a PDF receipt. */
export const PROOF_ACCEPT = `${IMAGE_ACCEPT},application/pdf`;
