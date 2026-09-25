'use client';

/** SHR-04: the UTM parameters of the link that brought the visitor, kept for the session. */
export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

const KEY = 'doulisha.utm';

/** Stores the UTM parameters of the current URL, if any (first touch wins). */
export function captureUtm(search: URLSearchParams) {
  const utm: Utm = {};
  for (const name of ['source', 'medium', 'campaign', 'content'] as const) {
    const value = search.get(`utm_${name}`);
    if (value) utm[name] = value.slice(0, 60);
  }
  if (Object.keys(utm).length === 0) return;
  try {
    if (!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, JSON.stringify(utm));
  } catch {
    // Storage can be unavailable (private mode); attribution is best effort.
  }
}

export function readUtm(): Utm {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Utm;
  } catch {
    return {};
  }
}
