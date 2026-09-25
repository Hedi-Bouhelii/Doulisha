'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      className="min-h-11 rounded-full print:hidden"
      onClick={() => window.print()}
    >
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
