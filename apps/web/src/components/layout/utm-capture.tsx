'use client';

import { useEffect } from 'react';

import { captureUtm } from '@/lib/utm';

/** Remembers which shared link brought the visitor (SHR-04). Renders nothing. */
export function UtmCapture() {
  useEffect(() => {
    captureUtm(new URLSearchParams(window.location.search));
  }, []);
  return null;
}
