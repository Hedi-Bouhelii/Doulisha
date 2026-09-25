import { relations } from 'drizzle-orm';

import { attendees, bookings, orders, payments } from './commerce';
import {
  categories,
  events,
  invitations,
  meetingPoints,
  rsvps,
  templates,
  ticketTypes,
} from './events';
import { organizerProfiles, profiles, userRoles, users } from './identity';

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  roles: many(userRoles),
  organizerProfiles: many(organizerProfiles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const organizerProfilesRelations = relations(organizerProfiles, ({ one, many }) => ({
  owner: one(users, { fields: [organizerProfiles.ownerUserId], references: [users.id] }),
  events: many(events),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  templates: many(templates),
  events: many(events),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  category: one(categories, { fields: [templates.categoryId], references: [categories.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(categories, { fields: [events.categoryId], references: [categories.id] }),
  template: one(templates, { fields: [events.templateId], references: [templates.id] }),
  organizer: one(organizerProfiles, {
    fields: [events.organizerProfileId],
    references: [organizerProfiles.id],
  }),
  creator: one(users, { fields: [events.creatorId], references: [users.id] }),
  ticketTypes: many(ticketTypes),
  meetingPoints: many(meetingPoints),
  invitations: many(invitations),
  rsvps: many(rsvps),
  bookings: many(bookings),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one }) => ({
  event: one(events, { fields: [ticketTypes.eventId], references: [events.id] }),
}));

export const meetingPointsRelations = relations(meetingPoints, ({ one }) => ({
  event: one(events, { fields: [meetingPoints.eventId], references: [events.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  event: one(events, { fields: [invitations.eventId], references: [events.id] }),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
  user: one(users, { fields: [rsvps.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  event: one(events, { fields: [orders.eventId], references: [events.id] }),
  bookings: many(bookings),
  payments: many(payments),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  order: one(orders, { fields: [bookings.orderId], references: [orders.id] }),
  event: one(events, { fields: [bookings.eventId], references: [events.id] }),
  ticketType: one(ticketTypes, { fields: [bookings.ticketTypeId], references: [ticketTypes.id] }),
  meetingPoint: one(meetingPoints, {
    fields: [bookings.meetingPointId],
    references: [meetingPoints.id],
  }),
  attendees: many(attendees),
}));

export const attendeesRelations = relations(attendees, ({ one }) => ({
  booking: one(bookings, { fields: [attendees.bookingId], references: [bookings.id] }),
  event: one(events, { fields: [attendees.eventId], references: [events.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
