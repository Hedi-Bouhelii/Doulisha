/** Small count next to a menu link (unread messages); nothing when zero. */
export function CountBadge({ count, testId }: { count?: number; testId?: string }) {
  if (!count) return null;
  return (
    <span
      className="ltr-nums ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-xs leading-5 font-semibold text-highlight-foreground"
      data-testid={testId}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
