'use client';

import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

/** Shows a value compactly: dates as ISO, objects as JSON, long text shortened. */
function display(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toISOString().replace('T', ' ').slice(0, 16);
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** Table list with row counts and the latest rows of the selected table. */
export function DataExplorer() {
  const t = useTranslations('Admin');
  const tStates = useTranslations('States');
  const trpc = useTRPC();
  const [table, setTable] = useState('events');

  const tables = useQuery(trpc.admin.tables.queryOptions());
  const rows = useQuery(trpc.admin.rows.queryOptions({ table, limit: 50 }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label={t('tables')} className="rounded-xl border border-border bg-card p-2">
        <p className="px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('tables')}
        </p>
        {tables.isPending ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : (
          <ul className="flex gap-1 overflow-x-auto lg:flex-col" data-testid="admin-tables">
            {tables.data?.map((entry) => (
              <li key={entry.table}>
                <button
                  type="button"
                  onClick={() => setTable(entry.table)}
                  aria-current={entry.table === table ? 'true' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-sm whitespace-nowrap',
                    entry.table === table
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  <span className="font-mono">{entry.table}</span>
                  <span className="text-xs opacity-80">{t('rows', { count: entry.rows })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <section className="min-w-0 rounded-xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-sans text-base font-semibold">
          <Database className="size-4 text-primary" aria-hidden="true" />
          {t('latestRows', { table })}
        </h2>
        {rows.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : rows.isError ? (
          <EmptyState
            tone="alert"
            className="m-4"
            title={tStates('errorTitle')}
            hint={tStates('errorHint')}
          />
        ) : rows.data.rows.length === 0 ? (
          <EmptyState className="m-4" title={t('noRows')} />
        ) : (
          <div className="overflow-x-auto" dir="ltr">
            <Table data-testid="admin-rows">
              <TableHeader>
                <TableRow>
                  {rows.data.columns.map((column) => (
                    <TableHead key={column} className="font-mono text-xs">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.rows.map((row, i) => (
                  <TableRow key={String(row.id ?? i)}>
                    {rows.data.columns.map((column) => (
                      <TableCell key={column} className="max-w-72 truncate text-xs">
                        {display(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
