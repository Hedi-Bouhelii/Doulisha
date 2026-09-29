import 'server-only';

import { join } from 'node:path';

/**
 * Where the local storage provider keeps files in development: public files
 * are served by Next as /uploads/…, private files (payment proofs) live outside
 * public/ and are only served through permission-checked routes.
 */
export function localPath(bucket: 'public' | 'private', key: string) {
  const root =
    bucket === 'public'
      ? join(process.cwd(), 'public', 'uploads')
      : join(process.cwd(), '.private-uploads');
  return join(root, ...key.split('/'));
}
