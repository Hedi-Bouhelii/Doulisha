/** Loading state of the conversations list. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
