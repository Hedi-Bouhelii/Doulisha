import { PageSkeleton } from '@/components/doulisha/page-skeleton';

/** Loading state of the organizer space (its layout gives the page width). */
export default function Loading() {
  return <PageSkeleton variant="dashboard" bare />;
}
