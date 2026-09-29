import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { keyBelongsTo } from '@doulisha/storage';
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, notInArray, or } from 'drizzle-orm';

import type { ServiceDeps } from '../deps';
import {
  canRemoveWallItem,
  COMMENT_MAX_LENGTH,
  COMMENTS_PER_HOUR,
  POST_MAX_LENGTH,
  POST_MAX_PHOTOS,
  POSTS_PER_HOUR,
  tallyReactions,
  WALL_PAGE,
  wallOpen,
  type ReactionKind,
} from '../domain/wall-rules';
import { AppError } from '../errors';
import { canManageEvent, type Actor } from '../permissions';
import { blockedIds, isBlockedBy } from './blocks';

const HOUR = 3_600_000;

async function loadWallEvent(db: Executor, eventId: string) {
  const [event] = await db
    .select({
      id: schema.events.id,
      visibility: schema.events.visibility,
      status: schema.events.status,
      deletedAt: schema.events.deletedAt,
      creatorId: schema.events.creatorId,
      organizerOwnerId: schema.organizerProfiles.ownerUserId,
    })
    .from(schema.events)
    .leftJoin(
      schema.organizerProfiles,
      eq(schema.organizerProfiles.id, schema.events.organizerProfileId),
    )
    .where(eq(schema.events.id, eventId));
  // Private events have no wall; say "not found" so nobody learns they exist.
  if (!event || !wallOpen(event)) throw new AppError('NOT_FOUND', 'errors.notFound');
  return event;
}
type WallEvent = Awaited<ReturnType<typeof loadWallEvent>>;

function manages(actor: Actor | null, event: WallEvent) {
  return canManageEvent(actor, {
    creatorId: event.creatorId,
    organizerOwnerId: event.organizerOwnerId,
  });
}

function assertMember(actor: Actor | null): asserts actor is Actor {
  if (!actor || actor.isAnonymous) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
}

/**
 * SOC-04 event wall: posts (latest first, 20 per page), their photos,
 * comments and reactions (SOC-05). Content of people the viewer blocked is
 * left out (TRS-03).
 */
export async function listWall(
  db: Executor,
  deps: Pick<ServiceDeps, 'storage'>,
  actor: Actor | null,
  eventId: string,
  cursor?: Date | null,
) {
  const event = await loadWallEvent(db, eventId);
  const viewerId = actor && !actor.isAnonymous ? actor.userId : null;
  const hidden = [...(await blockedIds(db, viewerId))];
  const isManager = manages(actor, event);
  const organizers = new Set([event.creatorId, event.organizerOwnerId].filter(Boolean));
  const p = schema.posts;

  const postRows = await db
    .select({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      authorId: p.authorId,
      authorName: schema.users.name,
      authorImage: schema.users.image,
    })
    .from(p)
    .innerJoin(schema.users, eq(schema.users.id, p.authorId))
    .where(
      and(
        eq(p.eventId, eventId),
        isNull(p.deletedAt),
        cursor ? lt(p.createdAt, cursor) : undefined,
        hidden.length ? notInArray(p.authorId, hidden) : undefined,
      ),
    )
    .orderBy(desc(p.createdAt))
    .limit(WALL_PAGE + 1);
  const page = postRows.slice(0, WALL_PAGE);
  const postIds = page.map((row) => row.id);

  const [photos, commentRows] = postIds.length
    ? await Promise.all([
        db
          .select({ id: schema.media.id, postId: schema.media.postId, key: schema.media.key })
          .from(schema.media)
          .where(and(inArray(schema.media.postId, postIds), isNull(schema.media.deletedAt)))
          .orderBy(asc(schema.media.sort)),
        db
          .select({
            id: schema.comments.id,
            postId: schema.comments.postId,
            body: schema.comments.body,
            createdAt: schema.comments.createdAt,
            authorId: schema.comments.authorId,
            authorName: schema.users.name,
            authorImage: schema.users.image,
          })
          .from(schema.comments)
          .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
          .where(
            and(
              inArray(schema.comments.postId, postIds),
              isNull(schema.comments.deletedAt),
              hidden.length ? notInArray(schema.comments.authorId, hidden) : undefined,
            ),
          )
          .orderBy(asc(schema.comments.createdAt)),
      ])
    : [[], []];

  const commentIds = commentRows.map((c) => c.id);
  const r = schema.reactions;
  const reactionRows = postIds.length
    ? await db
        .select({ userId: r.userId, targetType: r.targetType, targetId: r.targetId, kind: r.kind })
        .from(r)
        .where(
          or(
            and(eq(r.targetType, 'post'), inArray(r.targetId, postIds)),
            commentIds.length
              ? and(eq(r.targetType, 'comment'), inArray(r.targetId, commentIds))
              : undefined,
          ),
        )
    : [];
  const reactionsOf = (targetId: string) =>
    tallyReactions(
      reactionRows.filter((row) => row.targetId === targetId),
      viewerId,
    );
  const author = (row: { authorId: string; authorName: string; authorImage: string | null }) => ({
    id: row.authorId,
    name: row.authorName,
    image: row.authorImage,
    isOrganizer: organizers.has(row.authorId),
  });

  return {
    canPost: viewerId !== null,
    posts: page.map((post) => ({
      id: post.id,
      body: post.body,
      createdAt: post.createdAt,
      author: author(post),
      photos: photos
        .filter((photo) => photo.postId === post.id)
        .map((photo) => ({ id: photo.id, url: deps.storage.publicUrl(photo.key) })),
      reactions: reactionsOf(post.id),
      canRemove:
        viewerId !== null &&
        canRemoveWallItem({ actorId: viewerId, authorId: post.authorId, managesEvent: isManager }),
      comments: commentRows
        .filter((comment) => comment.postId === post.id)
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          author: author(comment),
          reactions: reactionsOf(comment.id),
          canRemove:
            viewerId !== null &&
            canRemoveWallItem({
              actorId: viewerId,
              authorId: comment.authorId,
              managesEvent: isManager,
            }),
        })),
    })),
    nextCursor: postRows.length > WALL_PAGE ? page.at(-1)!.createdAt : null,
  };
}

async function recentCount(
  db: Executor,
  table: typeof schema.posts | typeof schema.comments,
  authorId: string,
  since: Date,
) {
  const [row] = await db
    .select({ n: count() })
    .from(table)
    .where(and(eq(table.authorId, authorId), gt(table.createdAt, since)));
  return row?.n ?? 0;
}

/** SOC-04: a post with text and up to four photos uploaded as `post-photo`. */
export async function createPost(
  db: Executor,
  actor: Actor | null,
  input: { eventId: string; body: string; photoKeys: string[] },
  now = new Date(),
) {
  assertMember(actor);
  await loadWallEvent(db, input.eventId);
  const body = input.body.trim();
  if (body.length > POST_MAX_LENGTH || (!body && input.photoKeys.length === 0)) {
    throw new AppError('BAD_REQUEST', 'errors.postLength');
  }
  if (input.photoKeys.length > POST_MAX_PHOTOS) {
    throw new AppError('BAD_REQUEST', 'errors.tooManyPhotos', { max: POST_MAX_PHOTOS });
  }
  for (const key of input.photoKeys) {
    if (!keyBelongsTo(key, 'post-photo', actor.userId)) {
      throw new AppError('FORBIDDEN', 'errors.forbidden');
    }
  }
  if (
    (await recentCount(db, schema.posts, actor.userId, new Date(now.getTime() - HOUR))) >=
    POSTS_PER_HOUR
  ) {
    throw new AppError('TOO_MANY_REQUESTS', 'errors.tooManyPosts');
  }
  const [post] = await db
    .insert(schema.posts)
    .values({ authorId: actor.userId, eventId: input.eventId, body, createdAt: now })
    .returning({ id: schema.posts.id });
  if (input.photoKeys.length) {
    await db.insert(schema.media).values(
      input.photoKeys.map((key, sort) => ({
        ownerId: actor.userId,
        kind: 'image' as const,
        bucket: 'public' as const,
        key,
        eventId: input.eventId,
        postId: post!.id,
        sort,
      })),
    );
  }
  return { id: post!.id };
}

async function loadPost(db: Executor, postId: string) {
  const [post] = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId, eventId: schema.posts.eventId })
    .from(schema.posts)
    .where(and(eq(schema.posts.id, postId), isNull(schema.posts.deletedAt)));
  if (!post?.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
  return { ...post, event: await loadWallEvent(db, post.eventId) };
}

async function loadComment(db: Executor, commentId: string) {
  const [comment] = await db
    .select({
      id: schema.comments.id,
      authorId: schema.comments.authorId,
      postId: schema.comments.postId,
    })
    .from(schema.comments)
    .where(and(eq(schema.comments.id, commentId), isNull(schema.comments.deletedAt)));
  if (!comment) throw new AppError('NOT_FOUND', 'errors.notFound');
  return { ...comment, post: await loadPost(db, comment.postId) };
}

/** Removes a post (author, organizers, admins). */
export async function removePost(
  db: Executor,
  actor: Actor | null,
  postId: string,
  now = new Date(),
) {
  assertMember(actor);
  const post = await loadPost(db, postId);
  if (
    !canRemoveWallItem({
      actorId: actor.userId,
      authorId: post.authorId,
      managesEvent: manages(actor, post.event),
    })
  ) {
    throw new AppError('FORBIDDEN', 'errors.forbidden');
  }
  await db.update(schema.posts).set({ deletedAt: now }).where(eq(schema.posts.id, postId));
}

/** SOC-05 comment on a post. Refused if the post's author blocked the member. */
export async function addComment(
  db: Executor,
  actor: Actor | null,
  input: { postId: string; body: string },
  now = new Date(),
) {
  assertMember(actor);
  const post = await loadPost(db, input.postId);
  const body = input.body.trim();
  if (!body || body.length > COMMENT_MAX_LENGTH) {
    throw new AppError('BAD_REQUEST', 'errors.commentLength');
  }
  if (await isBlockedBy(db, [post.authorId], actor.userId)) {
    throw new AppError('FORBIDDEN', 'errors.cannotInteract');
  }
  if (
    (await recentCount(db, schema.comments, actor.userId, new Date(now.getTime() - HOUR))) >=
    COMMENTS_PER_HOUR
  ) {
    throw new AppError('TOO_MANY_REQUESTS', 'errors.tooManyComments');
  }
  const [comment] = await db
    .insert(schema.comments)
    .values({ postId: input.postId, authorId: actor.userId, body, createdAt: now })
    .returning({ id: schema.comments.id });
  return { id: comment!.id };
}

/** Removes a comment (author, organizers, admins). */
export async function removeComment(
  db: Executor,
  actor: Actor | null,
  commentId: string,
  now = new Date(),
) {
  assertMember(actor);
  const comment = await loadComment(db, commentId);
  if (
    !canRemoveWallItem({
      actorId: actor.userId,
      authorId: comment.authorId,
      managesEvent: manages(actor, comment.post.event),
    })
  ) {
    throw new AppError('FORBIDDEN', 'errors.forbidden');
  }
  await db.update(schema.comments).set({ deletedAt: now }).where(eq(schema.comments.id, commentId));
}

/** SOC-05: one reaction per member and post or comment; `kind: null` removes it. */
export async function react(
  db: Executor,
  actor: Actor | null,
  input: { targetType: 'post' | 'comment'; targetId: string; kind: ReactionKind | null },
) {
  assertMember(actor);
  if (input.targetType === 'post') await loadPost(db, input.targetId);
  else await loadComment(db, input.targetId);
  const r = schema.reactions;
  const where = and(
    eq(r.userId, actor.userId),
    eq(r.targetType, input.targetType),
    eq(r.targetId, input.targetId),
  );
  if (input.kind === null) {
    await db.delete(r).where(where);
    return;
  }
  await db
    .insert(r)
    .values({
      userId: actor.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      kind: input.kind,
    })
    .onConflictDoUpdate({
      target: [r.userId, r.targetType, r.targetId],
      set: { kind: input.kind },
    });
}
