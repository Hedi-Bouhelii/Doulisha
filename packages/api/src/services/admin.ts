import type { Db } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { count, desc, getTableColumns } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * Tables the admin data explorer may show. Secrets (sessions, accounts,
 * auth tokens) and sensitive data (emergency and medical info) are never listed.
 */
const explorableTables = {
  users: schema.users,
  user_roles: schema.userRoles,
  profiles: schema.profiles,
  organizer_profiles: schema.organizerProfiles,
  provider_profiles: schema.providerProfiles,
  categories: schema.categories,
  templates: schema.templates,
  events: schema.events,
  ticket_types: schema.ticketTypes,
  meeting_points: schema.meetingPoints,
  invitations: schema.invitations,
  rsvps: schema.rsvps,
  orders: schema.orders,
  bookings: schema.bookings,
  attendees: schema.attendees,
  payments: schema.payments,
  subscriptions: schema.subscriptions,
} satisfies Record<string, PgTable>;

export type ExplorableTable = keyof typeof explorableTables;
export const explorableTableNames = Object.keys(explorableTables) as ExplorableTable[];

/** Row counts for every explorable table. */
export async function tableOverview(db: Db): Promise<{ table: ExplorableTable; rows: number }[]> {
  return Promise.all(
    explorableTableNames.map(async (table) => {
      const [row] = await db.select({ n: count() }).from(explorableTables[table]);
      return { table, rows: row?.n ?? 0 };
    }),
  );
}

/** Latest rows of one table, newest first when it has a `createdAt` column. */
export async function tableRows(db: Db, table: ExplorableTable, limit: number) {
  const source = explorableTables[table];
  const columns = getTableColumns(source);
  const createdAt = 'createdAt' in columns ? columns.createdAt : undefined;
  const query = db.select().from(source).limit(limit);
  const rows = (await (createdAt ? query.orderBy(desc(createdAt)) : query)) as Record<
    string,
    unknown
  >[];
  return { columns: Object.keys(columns), rows };
}
