const BACKSLASH = String.fromCharCode(92);

/** Only internal paths are accepted as a destination after signing in or up. */
export function safeNext(value: string | string[] | undefined | null): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes(BACKSLASH)
    ? next
    : '/';
}
