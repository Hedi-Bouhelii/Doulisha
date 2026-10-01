import { PageSkeleton } from '@/components/doulisha/page-skeleton';

/** Loading state of an event's management pages. */
export default function Loading() {
  return <PageSkeleton variant="detail" bare />;
}
