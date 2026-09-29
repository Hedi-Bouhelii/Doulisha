/** Horizontal bars, one per UTM source (SHR-04). */
export function SourceBars({
  sources,
  total,
  direct,
}: {
  sources: { source: string; orders: number }[];
  total: number;
  direct: string;
}) {
  return (
    <ul className="space-y-2">
      {sources.map((s) => (
        <li key={s.source} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="capitalize">{s.source === 'direct' ? direct : s.source}</span>
            <span className="ltr-nums text-muted-foreground">{s.orders}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(4, Math.round((s.orders / Math.max(total, 1)) * 100))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
