/** Event wall and safety limits (SOC-04, SOC-05, TRS-03, ADR 0022). */
export const POST_MAX_LENGTH = 2000;
export const COMMENT_MAX_LENGTH = 1000;
export const POST_MAX_PHOTOS = 4;
export const POSTS_PER_HOUR = 10;
export const COMMENTS_PER_HOUR = 30;
export const REPORTS_PER_DAY = 20;
export const WALL_PAGE = 20;

export const REACTION_KINDS = ['like', 'love', 'fire', 'clap', 'haha'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'scam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGETS = ['event', 'post', 'comment', 'user', 'organizer', 'message'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/** Events whose page has a wall: public or unlisted, published or over. Private events use their group chat. */
export function wallOpen(event: { visibility: string; status: string; deletedAt: Date | null }) {
  return (
    event.visibility !== 'private' &&
    ['published', 'full', 'completed'].includes(event.status) &&
    event.deletedAt === null
  );
}

/** A post or comment can be removed by its author, the event's organizers and admins. */
export function canRemoveWallItem(input: {
  actorId: string;
  authorId: string;
  managesEvent: boolean;
}) {
  return input.actorId === input.authorId || input.managesEvent;
}

/** Tallies reactions by kind and finds the viewer's own. */
export function tallyReactions(
  rows: { userId: string; kind: ReactionKind }[],
  viewerId: string | null,
) {
  const counts: Partial<Record<ReactionKind, number>> = {};
  let mine: ReactionKind | null = null;
  for (const row of rows) {
    counts[row.kind] = (counts[row.kind] ?? 0) + 1;
    if (row.userId === viewerId) mine = row.kind;
  }
  return { counts, mine, total: rows.length };
}
