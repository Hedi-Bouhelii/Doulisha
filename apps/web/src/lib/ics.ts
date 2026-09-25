/** iCalendar date-time in UTC, e.g. 20261003T060000Z. */
function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escapes text values as RFC 5545 requires (backslash, newline, comma, semicolon). */
function escape(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`);
}

/** TKT-04 "add to calendar": a one-event .ics file. */
export function buildIcs(event: {
  uid: string;
  title: string;
  start: Date;
  end: Date | null;
  location?: string | null;
  url: string;
}) {
  const end = event.end ?? new Date(event.start.getTime() + 2 * 3_600_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doulisha//Tickets//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid}@doulisha.tn`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.location ? `LOCATION:${escape(event.location)}` : null,
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}
