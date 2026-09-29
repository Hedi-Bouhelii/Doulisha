import { EventCardSkeleton } from '@/components/doulisha/event-card';

/** Loading state of the feed. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
