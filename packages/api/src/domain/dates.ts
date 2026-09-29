/** Tunisia is UTC+1 all year. */
const TUNIS_OFFSET_MS = 3_600_000;
const DAY = 86_400_000;

export type WhenFilter = 'today' | 'tonight' | 'weekend' | 'week' | 'month';

/** Midnight (Tunis) of the day containing `now`, as a UTC instant. */
function startOfTunisDay(now: Date): number {
  const local = now.getTime() + TUNIS_OFFSET_MS;
  return local - (local % DAY) - TUNIS_OFFSET_MS;
}

/**
 * Date ranges for DSC-02 ("tonight", "this weekend"…) in Tunisia time.
 * The range starts no earlier than `now`, so events already started are excluded.
 */
export function whenRange(when: WhenFilter, now = new Date()): { from: Date; to: Date } {
  const today = startOfTunisDay(now);
  const from = (t: number) => new Date(Math.max(t, now.getTime()));
  switch (when) {
    case 'today':
      return { from: from(today), to: new Date(today + DAY) };
    case 'tonight':
      // From 18:00 until 04:00 the next morning.
      return { from: from(today + 18 * 3_600_000), to: new Date(today + DAY + 4 * 3_600_000) };
    case 'weekend': {
      // Tunisian weekend: Saturday and Sunday. Friday evening counts too.
      const weekday = new Date(today + TUNIS_OFFSET_MS).getUTCDay(); // 0 = Sunday
      const daysToSaturday = weekday === 0 ? -1 : 6 - weekday;
      const saturday = today + daysToSaturday * DAY;
      return { from: from(saturday - 6 * 3_600_000), to: new Date(saturday + 2 * DAY) };
    }
    case 'week':
      return { from: from(today), to: new Date(today + 7 * DAY) };
    case 'month':
      return { from: from(today), to: new Date(today + 31 * DAY) };
  }
}
