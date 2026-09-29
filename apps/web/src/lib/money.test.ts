import { describe, expect, it } from 'vitest';

import { buildIcs } from './ics';
import { millimesToInput, parseDinars } from './money';

describe('money inputs', () => {
  it('parses dinars with comma or dot into millimes', () => {
    expect(parseDinars('45')).toBe(45_000);
    expect(parseDinars('12,5')).toBe(12_500);
    expect(parseDinars('0.25')).toBe(250);
    expect(parseDinars('')).toBeNull();
    expect(parseDinars('-3')).toBeNull();
    expect(parseDinars('abc')).toBeNull();
  });

  it('formats millimes for inputs', () => {
    expect(millimesToInput(12_500)).toBe('12.5');
    expect(millimesToInput(null)).toBe('');
  });
});

describe('buildIcs', () => {
  it('builds a valid event in UTC and escapes text', () => {
    const ics = buildIcs({
      uid: 'DLS-ABC123',
      title: 'Randonnée, Aïn Draham',
      start: new Date('2026-10-03T06:00:00Z'),
      end: null,
      location: 'Forêt; Kroumirie',
      url: 'https://doulisha.tn/fr/tickets/DLS-ABC123',
    });
    expect(ics).toContain('DTSTART:20261003T060000Z');
    expect(ics).toContain('DTEND:20261003T080000Z');
    expect(ics).toContain(String.raw`SUMMARY:Randonnée\, Aïn Draham`);
    expect(ics).toContain(String.raw`LOCATION:Forêt\; Kroumirie`);
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
