'use client';

import { formatDate, formatTime, type Locale } from '@doulisha/i18n';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, MessageSquare, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { initials } from '@/components/doulisha/friends-going';
import { ItemMenu } from '@/components/doulisha/safety';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { putFile } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';
import type { RouterOutputs } from '@/trpc/types';

type Wall = RouterOutputs['wall']['list'];
type Post = Wall['posts'][number];
type Reactions = Post['reactions'];
type Author = Post['author'];

const MAX_PHOTOS = 4;
const REACTIONS = [
  ['like', '👍'],
  ['love', '❤️'],
  ['fire', '🔥'],
  ['clap', '👏'],
  ['haha', '😂'],
] as const;
type ReactionKind = (typeof REACTIONS)[number][0];

/**
 * Reloads the wall after a change. A load still running from before the change
 * is cancelled first, otherwise its older answer would be kept.
 */
function useWallRefresh() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return async () => {
    const queryKey = trpc.wall.list.pathKey();
    await queryClient.cancelQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey });
  };
}

function AuthorLine({ author, date }: { author: Author; date: Date }) {
  const t = useTranslations('Wall');
  const locale = useLocale() as Locale;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {author.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from Google, Facebook or uploads, any size
          <img src={author.image} alt="" className="size-full object-cover" />
        ) : (
          initials(author.name)
        )}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Link href={`/members/${author.id}`} className="truncate hover:underline" dir="auto">
            {author.name}
          </Link>
          {author.isOrganizer ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-xs font-normal text-primary">
              {t('organizer')}
            </span>
          ) : null}
        </p>
        <p className="ltr-nums text-xs text-muted-foreground">
          {formatDate(new Date(date), locale)} · {formatTime(new Date(date), locale)}
        </p>
      </div>
    </div>
  );
}

function ReactionBar({
  target,
  reactions,
  signedIn,
}: {
  target: { type: 'post' | 'comment'; id: string };
  reactions: Reactions;
  signedIn: boolean;
}) {
  const t = useTranslations('Wall');
  const trpc = useTRPC();
  const refresh = useWallRefresh();
  const react = useMutation(trpc.wall.react.mutationOptions());
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t('reactions')}>
      {REACTIONS.map(([kind, emoji]) => {
        const count = reactions.counts[kind as ReactionKind] ?? 0;
        const mine = reactions.mine === kind;
        if (!signedIn && count === 0) return null;
        return (
          <button
            key={kind}
            type="button"
            disabled={!signedIn || react.isPending}
            aria-pressed={mine}
            aria-label={t(`reaction.${kind}`)}
            onClick={() =>
              react.mutate(
                { targetType: target.type, targetId: target.id, kind: mine ? null : kind },
                { onSuccess: () => void refresh() },
              )
            }
            className={cn(
              'ltr-nums inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full border px-2 text-sm',
              mine ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-accent',
            )}
            data-testid={`react-${kind}`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 ? <span className="text-xs">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function CommentForm({ postId }: { postId: string }) {
  const t = useTranslations('Wall');
  const trpc = useTRPC();
  const refresh = useWallRefresh();
  const errorMessage = useErrorMessage();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comment = useMutation(trpc.wall.comment.mutationOptions());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setError(null);
    comment.mutate(
      { postId, body },
      {
        onSuccess: () => {
          setBody('');
          void refresh();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor={`comment-${postId}`} className="sr-only">
        {t('commentPlaceholder')}
      </label>
      <input
        id={`comment-${postId}`}
        value={body}
        maxLength={1000}
        dir="auto"
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('commentPlaceholder')}
        className="min-h-11 flex-1 rounded-full border border-input bg-card px-4 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        data-testid="comment-input"
      />
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 rounded-full"
        disabled={!body.trim() || comment.isPending}
        data-testid="comment-send"
      >
        {t('reply')}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function PostCard({
  post,
  viewerId,
  signedIn,
}: {
  post: Post;
  viewerId: string | null;
  signedIn: boolean;
}) {
  const t = useTranslations('Wall');
  const trpc = useTRPC();
  const refresh = useWallRefresh();
  const removePost = useMutation(trpc.wall.removePost.mutationOptions());
  const removeComment = useMutation(trpc.wall.removeComment.mutationOptions());
  const others = (author: Author) =>
    author.id === viewerId ? null : { id: author.id, name: author.name };

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-card p-4" data-testid="wall-post">
      <div className="flex items-start justify-between gap-2">
        <AuthorLine author={post.author} date={post.createdAt} />
        {signedIn ? (
          <ItemMenu
            label={t('postMenu')}
            report={{ type: 'post', id: post.id }}
            author={others(post.author)}
            onRemove={
              post.canRemove
                ? () => removePost.mutate({ postId: post.id }, { onSuccess: () => void refresh() })
                : undefined
            }
            onBlocked={() => void refresh()}
          />
        ) : null}
      </div>
      {post.body ? (
        <p className="whitespace-pre-wrap break-words" dir="auto">
          {post.body}
        </p>
      ) : null}
      {post.photos.length ? (
        <div
          className={cn(
            'grid gap-2 overflow-hidden rounded-xl',
            post.photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {post.photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- member upload, any size */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full bg-muted object-cover"
                data-testid="wall-photo"
              />
            </a>
          ))}
        </div>
      ) : null}
      <ReactionBar
        target={{ type: 'post', id: post.id }}
        reactions={post.reactions}
        signedIn={signedIn}
      />
      {post.comments.length || signedIn ? (
        <div className="space-y-3 border-t border-border pt-3">
          {post.comments.length ? (
            <ul className="space-y-3" aria-label={t('comments')}>
              {post.comments.map((comment) => (
                <li key={comment.id} className="space-y-1.5 ps-4" data-testid="wall-comment">
                  <div className="flex items-start justify-between gap-2">
                    <AuthorLine author={comment.author} date={comment.createdAt} />
                    {signedIn ? (
                      <ItemMenu
                        label={t('commentMenu')}
                        report={{ type: 'comment', id: comment.id }}
                        author={others(comment.author)}
                        onRemove={
                          comment.canRemove
                            ? () =>
                                removeComment.mutate(
                                  { commentId: comment.id },
                                  { onSuccess: () => void refresh() },
                                )
                            : undefined
                        }
                        onBlocked={() => void refresh()}
                      />
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm" dir="auto">
                    {comment.body}
                  </p>
                  <ReactionBar
                    target={{ type: 'comment', id: comment.id }}
                    reactions={comment.reactions}
                    signedIn={signedIn}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {signedIn ? <CommentForm postId={post.id} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function Composer({ eventId }: { eventId: string }) {
  const t = useTranslations('Wall');
  const trpc = useTRPC();
  const refresh = useWallRefresh();
  const errorMessage = useErrorMessage();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  const post = useMutation(trpc.wall.post.mutationOptions());

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const photoKeys: string[] = [];
      for (const file of files) {
        const ticket = await createUpload.mutateAsync({
          purpose: 'post-photo',
          contentType: file.type,
          size: file.size,
        });
        photoKeys.push(await putFile(ticket, file));
      }
      await post.mutateAsync({ eventId, body, photoKeys });
      setBody('');
      setFiles([]);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <label htmlFor="wall-body" className="sr-only">
        {t('placeholder')}
      </label>
      <textarea
        id="wall-body"
        value={body}
        maxLength={2000}
        rows={3}
        dir="auto"
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('placeholder')}
        className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        data-testid="wall-input"
      />
      {files.length ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
            >
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-background"
                aria-label={t('removePhoto')}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          className={cn(
            'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-accent',
            files.length >= MAX_PHOTOS && 'pointer-events-none opacity-50',
          )}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {t('addPhotos', { max: MAX_PHOTOS })}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              setFiles([...files, ...picked].slice(0, MAX_PHOTOS));
              e.target.value = '';
            }}
            data-testid="wall-photos"
          />
        </label>
        <Button
          type="submit"
          className="min-h-11 rounded-full px-6"
          disabled={busy || (!body.trim() && files.length === 0)}
          data-testid="wall-send"
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {t('publish')}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * SOC-04 event wall: questions, news and photos about the event, with
 * comments and reactions (SOC-05). Everyone reads it; members post.
 */
export function EventWall({
  eventId,
  viewerId,
  signInPath,
}: {
  eventId: string;
  /** The signed-in member, or null for visitors and guests. */
  viewerId: string | null;
  signInPath: string;
}) {
  const t = useTranslations('Wall');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const signedIn = viewerId !== null;
  const wall = useInfiniteQuery(
    trpc.wall.list.infiniteQueryOptions(
      { eventId },
      { getNextPageParam: (last) => last.nextCursor ?? undefined },
    ),
  );
  const posts = wall.data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <section aria-labelledby="wall-title" className="space-y-4" data-testid="event-wall">
      <h2 id="wall-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
        <MessageSquare className="size-5 text-primary" aria-hidden="true" />
        {t('title')}
      </h2>
      {signedIn ? (
        <Composer eventId={eventId} />
      ) : (
        <p className="rounded-xl bg-muted p-4 text-sm">
          <Link
            href={`/sign-in?next=${encodeURIComponent(signInPath)}`}
            className="font-semibold text-primary hover:underline"
            data-testid="wall-sign-in"
          >
            {t('signInToPost')}
          </Link>
        </p>
      )}
      {wall.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : wall.isError ? (
        <div role="alert" className="rounded-xl bg-muted p-4 text-sm">
          <p>{errorMessage(wall.error)}</p>
          <Button variant="outline" className="mt-3 min-h-11" onClick={() => void wall.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="wall-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} signedIn={signedIn} />
          ))}
        </ul>
      )}
      {wall.hasNextPage ? (
        <Button
          variant="outline"
          className="min-h-11 w-full rounded-full"
          disabled={wall.isFetchingNextPage}
          onClick={() => void wall.fetchNextPage()}
        >
          {t('more')}
        </Button>
      ) : null}
    </section>
  );
}
