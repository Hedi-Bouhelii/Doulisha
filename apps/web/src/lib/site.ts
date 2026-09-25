/**
 * Public origin of the site, for absolute links (share links, metadata,
 * JSON-LD, sitemap). NEXT_PUBLIC_APP_URL is inlined at build time, so reading
 * it does not need the server secrets.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const absoluteUrl = (path: string) =>
  `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

/** JSON for a `<script type="application/ld+json">`, safe against `</script>` in user text. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\' + 'u003c');
}
