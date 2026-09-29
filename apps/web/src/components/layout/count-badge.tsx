/** Small count next to a menu link (unread messages); nothing when zero. */
export function CountBadge({ count, testId }: { count?: number; testId?: string }) {
  if (!count) return null;
  return (
    <span
      className="ltr-nums ms-auto rounded-full bg-highlight px-1.5 text-xs font-semibold text-white"
      data-testid={testId}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
