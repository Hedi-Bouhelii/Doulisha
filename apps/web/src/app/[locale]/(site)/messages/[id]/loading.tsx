/** Loading state of a conversation. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      <div className="h-11 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
