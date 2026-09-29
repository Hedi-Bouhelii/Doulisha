import { describe, expect, it } from 'vitest';

import {
  type EventForm,
  parseCount,
  stepForProblem,
  toPatch,
  toPointInputs,
  toQuestionInputs,
  toTicketInputs,
} from './wizard-form';

const form: EventForm = {
  title: 'Rando',
  description: '  ',
  language: 'fr',
  coverUrl: null,
  startsAt: '2026-10-03T07:00',
  endsAt: '',
  venueName: '',
  address: '',
  city: ' Zaghouan ',
  locationHiddenUntilBooking: false,
  minAge: '',
  audience: ['friends'],
  capacity: '30',
  minToConfirm: '',
  waitlistEnabled: true,
  registrationType: 'paid',
  cancellationPolicy: 'moderate',
  visibility: 'public',
  whatToBring: 'Water\n\n Shoes ',
  dressCode: '',
  rules: '',
  safety: '',
  details: { difficulty: 'easy' },
  organizerProfileId: '',
};

describe('toPatch', () => {
  it('reads times as Tunisia time and empties as null', () => {
    const patch = toPatch(form);
    expect((patch.startsAt as Date).toISOString()).toBe('2026-10-03T06:00:00.000Z');
    expect(patch.endsAt).toBeNull();
    expect(patch.description).toBeNull();
    expect(patch.city).toBe('Zaghouan');
    expect(patch.capacity).toBe(30);
    expect(patch.minToConfirm).toBeNull();
    expect(patch.organizerProfileId).toBeNull();
    expect(patch.brief?.whatToBring).toEqual(['Water', 'Shoes']);
  });

  it('leaves the start untouched while the field is incomplete', () => {
    expect(toPatch({ ...form, startsAt: '' })).not.toHaveProperty('startsAt');
  });
});

describe('toTicketInputs', () => {
  const tickets = [
    {
      kind: 'standard' as const,
      name: 'Adulte',
      price: '65',
      deposit: '20',
      quantity: '',
      seats: '1',
    },
    { kind: 'student' as const, name: '  ', price: '40', deposit: '', quantity: '', seats: '1' },
  ];

  it('converts dinars to millimes and skips unnamed rows', () => {
    expect(toTicketInputs(tickets, 'paid')).toEqual([
      {
        kind: 'standard',
        name: 'Adulte',
        priceMillimes: 65000,
        depositMillimes: null,
        quantity: null,
        seatsPerTicket: 1,
      },
    ]);
  });

  it('keeps deposits only for deposit registration and forces free tickets for RSVP', () => {
    expect(toTicketInputs(tickets, 'deposit')[0]?.depositMillimes).toBe(20000);
    expect(toTicketInputs(tickets, 'free_rsvp')[0]?.priceMillimes).toBe(0);
  });
});

describe('lists', () => {
  it('drops incomplete meeting points and splits select options', () => {
    expect(toPointInputs([{ name: 'Tunis', meetAt: '' }])).toEqual([]);
    expect(
      toQuestionInputs([{ label: 'Size', type: 'select', options: 'S, M,, L', required: true }]),
    ).toEqual([{ label: 'Size', type: 'select', options: ['S', 'M', 'L'], required: true }]);
  });
});

describe('helpers', () => {
  it('parses whole counts only', () => {
    expect(parseCount('12')).toBe(12);
    expect(parseCount('1.5')).toBeNull();
    expect(parseCount('')).toBeNull();
  });

  it('opens the step that fixes a problem', () => {
    expect(stepForProblem('title')).toBe(0);
    expect(stepForProblem('city')).toBe(1);
    expect(stepForProblem('details.difficulty')).toBe(2);
    expect(stepForProblem('paidTickets')).toBe(3);
  });
});
