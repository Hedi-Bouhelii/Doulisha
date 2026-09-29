import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, count, eq, gt, isNull } from 'drizzle-orm';

import { REPORTS_PER_DAY, type ReportReason, type ReportTarget } from '../domain/wall-rules';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { requireAccess } from './chat';

const DAY = 86_400_000;

async function targetExists(db: Executor, actor: Actor, type: ReportTarget, id: string) {
  switch (type) {
    case 'event': {
      const [row] = await db
        .select({ id: schema.events.id })
        .from(schema.events)
        .where(and(eq(schema.events.id, id), isNull(schema.events.deletedAt)));
      return Boolean(row);
    }
    case 'post': {
      const [row] = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(eq(schema.posts.id, id));
      return Boolean(row);
    }
    case 'comment': {
      const [row] = await db
        .select({ id: schema.comments.id })
        .from(schema.comments)
        .where(eq(schema.comments.id, id));
      return Boolean(row);
    }
    case 'user': {
      const [row] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, id));
      return Boolean(row);
    }
    case 'organizer': {
      const [row] = await db
        .select({ id: schema.organizerProfiles.id })
        .from(schema.organizerProfiles)
        .where(eq(schema.organizerProfiles.id, id));
      return Boolean(row);
    }
    case 'message': {
      // Only people in the conversation can report one of its messages.
      const [row] = await db
        .select({ conversationId: schema.messages.conversationId })
        .from(schema.messages)
        .where(eq(schema.messages.id, id));
      if (!row) return false;
      await requireAccess(db, actor, row.conversationId);
      return true;
    }
  }
}

/**
 * TRS-03 report: stored for the moderation queue (ADM-02, Phase 5). Reporting
 * the same thing twice keeps one open report; 20 reports a day at most.
 */
export async function createReport(
  db: Executor,
  actor: Actor,
  input: {
    targetType: ReportTarget;
    targetId: string;
    reason: ReportReason;
    details?: string | null;
  },
  now = new Date(),
) {
  if (!(await targetExists(db, actor, input.targetType, input.targetId))) {
    throw new AppError('NOT_FOUND', 'errors.notFound');
  }
  const r = schema.reports;
  const [existing] = await db
    .select({ id: r.id })
    .from(r)
    .where(
      and(
        eq(r.reporterId, actor.userId),
        eq(r.targetType, input.targetType),
        eq(r.targetId, input.targetId),
        eq(r.status, 'open'),
      ),
    )
    .limit(1);
  if (existing) return { id: existing.id };
  const [today] = await db
    .select({ n: count() })
    .from(r)
    .where(and(eq(r.reporterId, actor.userId), gt(r.createdAt, new Date(now.getTime() - DAY))));
  if ((today?.n ?? 0) >= REPORTS_PER_DAY) {
    throw new AppError('TOO_MANY_REQUESTS', 'errors.tooManyReports');
  }
  const [report] = await db
    .insert(r)
    .values({
      reporterId: actor.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details?.trim() || null,
      createdAt: now,
    })
    .returning({ id: r.id });
  return { id: report!.id };
}
