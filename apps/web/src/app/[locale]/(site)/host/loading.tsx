import { PageSkeleton } from '@/components/doulisha/page-skeleton';

/** Loading state of the private invitations (the layout gives the width). */
export default function Loading() {
  return <PageSkeleton variant="list" bare />;
}
