import { notFound } from 'next/navigation';

/** Any unknown path inside a locale shows the localized not-found page. */
export default function CatchAll() {
  notFound();
}
